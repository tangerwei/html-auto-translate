import {readFileSync, writeFileSync} from "fs";
import {load} from "cheerio";
import {v4} from "uuid"
import {htmlWrite} from "./htmlWrite";
import {join} from "path";
import {Translator} from "deepl-node";
import { Converter } from "opencc-js";
import {compile} from "handlebars";

const deepL = new Translator("8b705d76-439b-055e-e5c5-7055b36c6cc9:fx");
const converter = Converter({ from: "cn", to: "hk" });

const wordSet: any = new Set();

// 判断语言类型
function judgeLanguage(text: string){
    // 是否包含中文
    return /[\u4e00-\u9fa5]/.test(text);
}

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

// 替换html中的文字 -> 生成{{uuid}}
function generateTemplate(fileText: string, dict: any){


}

async function parseHtml(fileText: string){
    const $ = load(fileText);
    traverseNodes($('body')[0]);
    analysisHeader($('head')[0]);
    // 生成字符表
    const dict:any = {}
    for (const word of wordSet) {
        dict[word] = {
            key: v4(),
            value: {},
        };
    }
    // const words = Object.keys(dict);
    const template = htmlWrite(fileText, dict);
    // 假设即存在中文，也存在英文
    const words = Object.keys(dict);
    // 仅翻译中文条目，en to zh 不准确
    // const wordCN = words.filter(judgeLanguage);
    if(words.length > 0){
        const resCN = await deepL.translateText(words, "zh","en-US");
        words.forEach((word: string, index: number) => {
            if(resCN[index]){
                dict[word].value['en'] = resCN[index].text;
                dict[word].value['tw'] = converter(word);
                dict[word].value['cn'] = word;
            }
        })
    }
    // split zh, en, tw
    const zhJson:any = {};
    const enJson:any = {};
    const twJson:any = {};
    Object.values(dict).forEach((word: any) => {
        zhJson[word.key] = word.value['cn'];
        enJson[word.key] = word.value['en'];
        twJson[word.key] = word.value['tw'];
    })
    // 生成翻译后的html
    const zhHtml = compile(template)(zhJson);
    const zhPath = join(__dirname, "../dist/zh.html");
    writeFile(zhPath, zhHtml);
    const enHtml = compile(template)(enJson);
    const enPath = join(__dirname, "../dist/en.html");
    writeFile(enPath, enHtml);
    const twHtml = compile(template)(twJson);
    const twPath = join(__dirname, "../dist/tw.html");
    writeFile(twPath, twHtml);
}

function writeFile(filePath: string, content: string){
    writeFileSync(filePath, content, 'utf-8');
}

export function analysisHtml(filePath: string){
    const fileText = readFileSync(filePath, 'utf-8');
    parseHtml(fileText);
}
