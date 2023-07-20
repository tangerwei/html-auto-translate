import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from "fs";
import {load} from "cheerio";
import {v4} from "uuid"
import {htmlWrite, outPut} from "./htmlWrite";
import {join} from "path";
import {compile} from "handlebars";
import HtmlParserConfig from "./config";
import {XOR} from "ts-xor";
import {TextResult} from "deepl-node";

//翻译有多种，每种对应loader
interface EnLoaderConfig {
    loader: "en-US";
    deepLToken: string;
}

interface TwLoaderConfig {
    loader: "zh-TW";
}

export type LoaderConfig = XOR<EnLoaderConfig, TwLoaderConfig>;

let translate: HtmlParserConfig

const wordSet: any = new Set();

// 解析文字是否需要翻译
function analysisText(text: string) {
    // 纯数字不需要翻译
    if (/^\d+$/.test(text)) {
        return false;
    }
    // 纯数字, 特殊符号不需要翻译
    if (/^[0-9a-zA-Z\.\,\;\:\?\!\@\#\$\%\^\&\*\(\)\-\_\=\+\[\]\{\}\|\\\~\`]+$/.test(text)) {
        return false;
    }
    wordSet.add(text);
}

function resolveTextNode(data: string) {
    const text = data.trim();
    if (text.length > 0) {
        // 去掉空格
        let textZ = text.trim();
        if (textZ) {
            // 如果包含换行，则将内容拆分
            if (textZ.includes("\n")) {
                const textList = textZ.split("\n");
                textList.forEach((item: string) => {
                    const _item = item.trim();
                    analysisText(_item)
                })
            } else {
                analysisText(textZ)
            }
        }
    }
}

// 查看标记，是否跳过翻译
export function ignoreEl(node: any) {
    if (!node.attribs) {
        return false;
    }
    const dataTransMark = node.attribs['data-trans'] || "on";
    return dataTransMark.trim() === 'off';
}

function analysisHeader(node: any) {
    if (node.name === 'meta') {
        // name = description, keywords
        if (node.attribs.name === 'description' || node.attribs.name === 'keywords') {
            const content = node.attribs.content;
            if (content) {
                analysisText(content)
            }
        }
    }
    if(node.name !== 'script'){
        if (node.type === 'text') {
            resolveTextNode(node.data);
        }
        if (node.children && !ignoreEl(node)) {
            node.children.forEach((child: any) => {
                analysisHeader(child);
            });
        }
    }
}

function traverseNodes(node: any) {
    if (node.name === 'script') {
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

async function parseHtml(fileText: string) {
    const $ = load(fileText);
    traverseNodes($('body')[0]);
    analysisHeader($('head')[0]);
    // 生成字符表
    const dict: any = {}
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
    if (words.length > 0) {
        let resCN: TextResult[] = []
        if (translate.deepL) {
            resCN = await translate.deepL.translateText(words, "zh", "en-US");
        }
        words.forEach((word: string, index: number) => {
            if (translate.deepL) {
                newDict[word].value['en'] = resCN[index].text;
            }
            if (translate.converter) {
                newDict[word].value['tw'] = translate.converter(word);
            }
            newDict[word].value['cn'] = word;
        })
    }
    // split zh, en, tw
    const zhJson: any = {};
    const enJson: any = {};
    const twJson: any = {};
    Object.values(newDict).forEach((word: any) => {
        zhJson[word.key] = word.value['cn'];
        if (translate.deepL) {
            enJson[word.key] = word.value['en'];
        }
        if (translate.converter) {
            twJson[word.key] = word.value['tw'];
        }
    })
    // 生成翻译后的html
    const res: any = {
        zh: compile(template)(zhJson)
    }
    if (translate.deepL) {
        res.en = compile(template)(enJson);
    }
    if (translate.converter) {
        res.tw = compile(template)(twJson);
    }
    // async 会变成 async=""
    return res;
}

function writeFile(filePath: string, content: string) {
    writeFileSync(filePath, content, 'utf-8');
}

async function analysisHtml(filePath: string) {
    const fileText = readFileSync(filePath, 'utf-8');
    return await parseHtml(fileText);
}

let basicPath = ""
const basePathMap: any = {};

function checkDir(basePath: string) {
    // 相对根目录的路径为
    const relativePath = basePath.replace(basicPath, "");
    // 目标路径
    Object.keys(basePathMap).forEach((key: string) => {
        const newPath = join(basePathMap[key], relativePath);
        if (!existsSync(newPath)) {
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

async function syncFolder(basePath: string) {
    // 检查目标目录是否存在 - basePathMap 所有对应的
    const relativePath = checkDir(basePath);
    const files = readdirSync(basePath, {withFileTypes: true});
    for (const file of files) {
        if (file.isDirectory()) {
            const folderPath = join(basePath, file.name);
            if (skipPath.includes(file.name)) {
                continue;
            }
            await syncFolder(folderPath);
        }
        if (file.isFile()) {
            if (skipFiles.includes(file.name)) {
                continue;
            }
            // html
            if (file.name.endsWith(".html")) {
                const filePath = join(basePath, file.name);
                const fileObject: any = await analysisHtml(filePath);
                if (fileObject) {
                    Object.keys(fileObject).forEach((key: string) => {
                        const sourceFilePath = join(basePathMap[key], relativePath, file.name);
                        writeFile(sourceFilePath, fileObject[key]);
                    })
                }
            } else {
                Object.keys(basePathMap).forEach((key: string) => {
                    const sourceFilePath = join(basePathMap[key], relativePath, file.name);
                    const filePath = join(basePath, file.name);
                    copyFileSync(filePath, sourceFilePath);
                })
            }
        }
    }
}

function transformLang(lang: string){
    const arr = lang.split("-");
    if (arr.length > 1) {
        return arr[0] + "-" + arr[1].toUpperCase();
    }
    return lang;
}

let langList: string[] = [];
let rootPath = ""

async function syncSeoFolder(outDir: string, domain: string, defaultFolderName: string) {
    const files = readdirSync(outDir, {withFileTypes: true});
    for (const file of files) {
        if (file.isDirectory()) {
            const folderPath = join(outDir, file.name);
            if (skipPath.includes(file.name)) {
                continue;
            }
            await syncSeoFolder(folderPath, domain, defaultFolderName);
        }
        if (file.isFile()) {
            if (skipFiles.includes(file.name)) {
                continue;
            }
            // html
            if (file.name.endsWith(".html")) {
                const relativePath = outDir.replace(rootPath, "");
                const pathArray = relativePath.split("/").filter(path => !!path);
                let pathPrefix = domain;
                let suffix = "";
                let currentLang = ""
                // 默认文件夹
                currentLang = pathArray.shift();
                currentLang = transformLang(currentLang);
                if(pathArray.length > 0){
                    suffix += pathArray.join("/");
                }
                // 最后是不是index.html
                if(file.name !== "index.html") {
                    suffix += join(suffix, file.name);
                }

                const filePath = join(outDir, file.name);
                // 读取文章
                const fileText = readFileSync(filePath, 'utf-8');
                const $ = load(fileText, {
                    decodeEntities: false,
                });
                let text = "    "
                // 默认地址
                text += `<link href="${pathPrefix}/${suffix}" rel="alternative" hreflang="${transformLang(defaultFolderName)}">`;
                // 其他语言地址
                langList.forEach((lang: string) => {
                    if(lang !== defaultFolderName){
                        const _lang = transformLang(lang);
                        text += "\n    " + `<link href="${pathPrefix}/${lang}/${suffix}" rel="alternative" hreflang="${_lang}">`
                    }
                })
                // html lang
                $("html").attr("lang", currentLang);
                // 当前canonical
                if(currentLang === defaultFolderName){
                    text += "\n    " + `<link rel="canonical" href="${pathPrefix}/${suffix}">`
                }else{
                    text += "\n    " + `<link rel="canonical" href="${pathPrefix}/${currentLang.toLowerCase()}/${suffix}">`;
                }
                // 生成seo
                $("head").append(text + "\n");

                // 生成文件
                const sourceFilePath = join(outDir, file.name);
                const finalFile =  $.html({
                    decodeEntities: false,
                })
                // async="" => async
                const finalFileText = finalFile.replace(/async=""/g, "async");
                writeFile(sourceFilePath, finalFileText);
            }
        }
    }
}

/**
 *
 * @param folderPath
 * @param config
 * @param domain 发布域名
 * @param defaultFolderName 默认文件夹名称
 */
export async function analysisFolder(folderPath: string, config: HtmlParserConfig, domain: string, defaultFolderName= "zh") {
    translate = config;
    const basePath = folderPath.split('/').slice(0, -1).join('/');
    basicPath = folderPath;
    const distPath = join(basePath, "dist");
    rootPath = distPath;
    if (!existsSync(distPath)) {
        mkdirSync(distPath);
    }
    langList = ["zh"];
    basePathMap.zh = join(distPath, 'zh');
    if (config.deepL) {
        langList.push("en-us")
        basePathMap.en = join(distPath, 'en-us');
    }
    if (config.converter) {
        langList.push("zh-tw")
        basePathMap.tw = join(distPath, 'zh-tw');
    }
    Object.keys(basePathMap).forEach((key: string) => {
        if (!existsSync(basePathMap[key])) {
            mkdirSync(basePathMap[key]);
        }
    })
    // 翻译
    await syncFolder(folderPath);
    await syncSeoFolder(distPath, domain, defaultFolderName);
}
