import { ConvertText } from "opencc-js";
import { Translator } from "deepl-node";
declare class HtmlParserConfig {
    deepL: Translator;
    converter: ConvertText;
    constructor(deepLToken: string);
}
export default HtmlParserConfig;
