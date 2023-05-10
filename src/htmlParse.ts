import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from "fs";
import {load} from "cheerio";
import {v4} from "uuid"
import {htmlWrite, outPut} from "./htmlWrite";
import {join} from "path";
import {compile} from "handlebars";
import HtmlParserConfig from "./config";

let translate:HtmlParserConfig

const wordSet: any = new Set();

// 解析文字是否需要翻译
function analysisText(text: string){
    // 纯数字不需要翻译
    if(/^\d+$/.test(text)){
        return false;
    }
    // 纯数字, 特殊符号不需要翻译
    if(/^[0-9a-zA-Z\.\,\;\:\?\!\@\#\$\%\^\&\*\(\)\-\_\=\+\[\]\{\}\|\\\~\`]+$/.test(text)){
        return false;
    }
    wordSet.add(text);
}

function resolveTextNode(data: string){
    const text = data.trim();
    if (text.length > 0) {
        // 去掉空格
        let textZ = text.trim();
        if(textZ){
            // 如果包含换行，则将内容拆分
            if(textZ.includes("\n")){
                const textList = textZ.split("\n");
                textList.forEach((item: string) => {
                    const _item = item.trim();
                    analysisText(_item)
                })
            }else{
                analysisText(textZ)
            }
        }
    }
}

// 查看标记，是否跳过翻译
export function ignoreEl(node: any){
    if(!node.attribs){
        return false;
    }
    const dataTransMark = node.attribs['data-trans'] || "on";
    return dataTransMark.trim() === 'off';
}

function analysisHeader(node:any){
    if(node.name === 'meta'){
        // name = description, keywords
        if(node.attribs.name === 'description' || node.attribs.name === 'keywords'){
            const content = node.attribs.content;
            if(content){
                analysisText(content)
            }
        }
    }
    if (node.type === 'text') {
        resolveTextNode(node.data);
    }
    if (node.children && !ignoreEl(node)) {
        node.children.forEach((child: any) => {
            analysisHeader(child);
        });
    }
}

function traverseNodes(node: any) {
    if(node.name === 'script'){
        return;
    }
    if (node.type === 'text') {
        resolveTextNode(node.data);
    }
    if (node.children && !ignoreEl(node)) {
        node.children.forEach((child: any) => {
            traverseNodes(child);
        });
    }
}

async function parseHtml(fileText: string){
    const $ = load(fileText);
    traverseNodes($('body')[0]);
    analysisHeader($('head')[0]);
    // 生成字符表
    const dict:any = {}
    wordSet.forEach((word) => {
        dict[word] = {
            key: v4(),
            value: {},
        };
    });
    // const words = Object.keys(dict);
    const template = htmlWrite(fileText, dict);
    const newDict = outPut.gDict
    // 假设即存在中文，也存在英文
    const words = Object.keys(newDict);
    // 仅翻译中文条目，en to zh 不准确
    // const wordCN = words.filter(judgeLanguage);
    if(words.length > 0){
        const resCN = await translate.deepL.translateText(words, "zh","en-US");
        words.forEach((word: string, index: number) => {
            if(resCN[index]){
                newDict[word].value['en'] = resCN[index].text;
                newDict[word].value['tw'] = translate.converter(word);
                newDict[word].value['cn'] = word;
            }
        })
    }
    // split zh, en, tw
    const zhJson:any = {};
    const enJson:any = {};
    const twJson:any = {};
    Object.values(newDict).forEach((word: any) => {
        zhJson[word.key] = word.value['cn'];
        enJson[word.key] = word.value['en'];
        twJson[word.key] = word.value['tw'];
    })
    // 生成翻译后的html
    const zhHtml = compile(template)(zhJson);
    const enHtml = compile(template)(enJson);
    const twHtml = compile(template)(twJson);
    return {
        zh: zhHtml,
        en: enHtml,
        tw: twHtml,
    }
}

function writeFile(filePath: string, content: string){
    writeFileSync(filePath, content, 'utf-8');
}

async function analysisHtml(filePath: string){
    const fileText = readFileSync(filePath, 'utf-8');
    return await parseHtml(fileText);
}

let basicPath = ""
const basePathMap:any = {};

function checkDir(basePath: string){
    // 相对根目录的路径为
    const relativePath = basePath.replace(basicPath, "");
    // 目标路径
    Object.keys(basePathMap).forEach((key: string) => {
        const newPath = join(basePathMap[key], relativePath);
        if(!existsSync(newPath)){
            mkdirSync(newPath);
        }
    })
    return relativePath;
}

const skipPath = [
    'node_modules',
    '.git',
    '.vscode',
    '.idea',
]

const skipFiles = [
    '.DS_Store',
    '.gitignore',
    'package-lock.json',
    'package.json',
    'README.md',
    'tsconfig.json',
    'yarn.lock',
    'translate.js',
]

async function syncFolder(basePath: string){
    // 检查目标目录是否存在 - basePathMap 所有对应的
    const relativePath = checkDir(basePath);
    const files = readdirSync(basePath, {withFileTypes: true});
    for (const file of files) {
        if(file.isDirectory()){
            const folderPath = join(basePath, file.name);
            if(skipPath.includes(file.name)){
                continue;
            }
            await syncFolder(folderPath);
        }
        if(file.isFile()){
            if(skipFiles.includes(file.name)){
                continue;
            }
            // html
            if(file.name.endsWith(".html")){
                const filePath = join(basePath, file.name);
                const fileObject:any = await analysisHtml(filePath);
                if(fileObject){
                    Object.keys(fileObject).forEach((key: string) => {
                        const sourceFilePath = join(basePathMap[key], relativePath, file.name);
                        writeFile(sourceFilePath, fileObject[key]);
                    })
                }
            }else{
                Object.keys(basePathMap).forEach((key: string) => {
                    const sourceFilePath = join(basePathMap[key], relativePath, file.name);
                    const filePath = join(basePath, file.name);
                    copyFileSync(filePath, sourceFilePath);
                })
            }
        }
    }
}

export async function analysisFolder(folderPath: string, config: HtmlParserConfig){
    translate = config;
    const basePath = folderPath.split('/').slice(0, -1).join('/');
    basicPath = folderPath;
    const distPath = join(basePath, "dist");
    if(!existsSync(distPath)){
        mkdirSync(distPath);
    }
    basePathMap.zh = join(distPath, 'zh');
    basePathMap.en = join(distPath, 'en');
    basePathMap.tw = join(distPath, 'tw');
    Object.keys(basePathMap).forEach((key: string) => {
        if(!existsSync(basePathMap[key])){
            mkdirSync(basePathMap[key]);
        }
    })
    await syncFolder(folderPath);
}
