import {analysisFolder, LoaderConfig} from "./htmlParse";
import {Translator} from "deepl-node";
import {Converter} from "opencc-js";
import HtmlParserConfig from "./config";


/**
 * 翻译
 * @param folderPath
 * @param loaders
 * @param domain
 */
function translate(folderPath:string, loaders: LoaderConfig[], domain: string){
    const sysConfig: HtmlParserConfig = {};
    // 翻译插件
    loaders.forEach(config => {
        if(config.loader === "en-US"){
            sysConfig.deepL = new Translator(config.deepLToken)
        }
        if(config.loader === "zh-TW"){
            sysConfig.converter = Converter({ from: "cn", to: "hk" });
        }
    })
    analysisFolder(folderPath, sysConfig, domain);
}

export default translate;
