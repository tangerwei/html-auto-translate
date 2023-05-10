"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("./config");
var htmlParse_1 = require("./htmlParse");
/**
 * 翻译
 * @param deepLToken
 * @param folderPath
 */
function translate(deepLToken, folderPath) {
    var config = new config_1.default(deepLToken);
    (0, htmlParse_1.analysisFolder)(folderPath, config);
}
exports.default = translate;
