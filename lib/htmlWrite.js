"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlWrite = void 0;
var cheerio_1 = require("cheerio");
var htmlParse_1 = require("./htmlParse");
var gDict = {};
function queryKey(word) {
    var _a;
    return (_a = gDict[word]) === null || _a === void 0 ? void 0 : _a.key;
}
function analysisNode(node) {
    if (node.name === 'script' || node.name === 'style') {
        return;
    }
    // content
    if (node.name === 'meta') {
        if (node.attribs.name === 'description' || node.attribs.name === 'keywords') {
            var content = node.attribs.content;
            if (content) {
                content = content.trim();
                var key = queryKey(content);
                if (key) {
                    node.attribs.content = "{{".concat(key, "}}");
                }
            }
        }
    }
    if (node.type === 'text') {
        var lines = node.data.split('\n');
        var newLines = lines.map(function (line) {
            var _line = line.trim();
            if (!_line) {
                return line;
            }
            var key = queryKey(_line);
            // console.log(key)
            if (key) {
                return line.replace(_line, "{{".concat(key, "}}"));
            }
            return line;
        });
        node.data = newLines.join('\n');
    }
    if (node.children && !(0, htmlParse_1.ignoreEl)(node)) {
        node.children.forEach(function (child) {
            analysisNode(child);
        });
    }
}
function htmlWrite(html, dict) {
    if (dict === void 0) { dict = {}; }
    var $ = (0, cheerio_1.load)(html);
    gDict = dict;
    $.root().each(function (i, el) {
        analysisNode(el);
    });
    return $.html();
}
exports.htmlWrite = htmlWrite;
