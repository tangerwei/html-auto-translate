import {ConvertText} from "opencc-js";
import {Translator} from "deepl-node";

interface HtmlParserConfig{
    deepL?: Translator;
    converter?: ConvertText
}

export default HtmlParserConfig
