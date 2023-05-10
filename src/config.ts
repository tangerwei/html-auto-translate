import {Converter, ConvertText} from "opencc-js";
import {Translator} from "deepl-node";

class HtmlParserConfig{
    deepL: Translator;
    converter: ConvertText
    constructor(deepLToken: string){
        this.deepL = new Translator(deepLToken);
        this.converter = Converter({ from: "cn", to: "hk" });
    }
}

export default HtmlParserConfig
