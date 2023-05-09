import {load} from "cheerio";
import {ignoreEl} from "./htmlParse";

let gDict: any = {};

function queryKey(word: string){
    return gDict[word]?.key;
}

function analysisNode(node: any){
    if(node.name === 'script' || node.name === 'style'){
        return;
    }
    // content
    if(node.name === 'meta'){
        if(node.attribs.name === 'description' || node.attribs.name === 'keywords'){
            let content = node.attribs.content;
            if(content){
                content = content.trim();
                const key = queryKey(content);
                if(key){
                    node.attribs.content = `{{${key}}}`;
                }
            }
        }
    }
    if (node.type === 'text') {
        const lines = node.data.split('\n');
        const newLines = lines.map((line: string) => {
            const _line = line.trim();
            if(!_line){
                return line;
            }
            const key = queryKey(_line);
            // console.log(key)
            if(key){
                return line.replace(_line, `{{${key}}}`);
            }
            return line;
        })
        node.data = newLines.join('\n');
    }
    if (node.children && !ignoreEl(node)) {
        node.children.forEach((child: any) => {
            analysisNode(child);
        });
    }
}

export function htmlWrite(html: string, dict: any = {}) {
    const $ = load(html);
    gDict = dict;
    $.root().each((i, el) => {
        analysisNode(el);
    });
    return $.html()
}
