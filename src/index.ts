import HtmlParserConfig from "./config";
import {analysisFolder} from "./htmlParse";

/**
 * 翻译
 * @param deepLToken
 * @param folderPath
 */
function translate(deepLToken:string, folderPath: string){
    const config = new HtmlParserConfig(deepLToken);
    analysisFolder(folderPath, config);
}

export default translate;
