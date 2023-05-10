"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var opencc_js_1 = require("opencc-js");
var deepl_node_1 = require("deepl-node");
var HtmlParserConfig = /** @class */ (function () {
    function HtmlParserConfig(deepLToken) {
        this.deepL = new deepl_node_1.Translator(deepLToken);
        this.converter = (0, opencc_js_1.Converter)({ from: "cn", to: "hk" });
    }
    return HtmlParserConfig;
}());
exports.default = HtmlParserConfig;
