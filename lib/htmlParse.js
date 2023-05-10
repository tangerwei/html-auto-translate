"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisFolder = exports.ignoreEl = void 0;
var fs_1 = require("fs");
var cheerio_1 = require("cheerio");
var uuid_1 = require("uuid");
var htmlWrite_1 = require("./htmlWrite");
var path_1 = require("path");
var handlebars_1 = require("handlebars");
var translate;
var wordSet = new Set();
// 解析文字是否需要翻译
function analysisText(text) {
    // 纯数字不需要翻译
    if (/^\d+$/.test(text)) {
        return false;
    }
    // 纯数字, 特殊符号不需要翻译
    if (/^[0-9a-zA-Z\.\,\;\:\?\!\@\#\$\%\^\&\*\(\)\-\_\=\+\[\]\{\}\|\\\~\`]+$/.test(text)) {
        return false;
    }
    wordSet.add(text);
}
function resolveTextNode(data) {
    var text = data.trim();
    if (text.length > 0) {
        // 去掉空格
        var textZ = text.trim();
        if (textZ) {
            // 如果包含换行，则将内容拆分
            if (textZ.includes("\n")) {
                var textList = textZ.split("\n");
                textList.forEach(function (item) {
                    var _item = item.trim();
                    analysisText(_item);
                });
            }
            else {
                analysisText(textZ);
            }
        }
    }
}
// 查看标记，是否跳过翻译
function ignoreEl(node) {
    if (!node.attribs) {
        return false;
    }
    var dataTransMark = node.attribs['data-trans'] || "on";
    return dataTransMark.trim() === 'off';
}
exports.ignoreEl = ignoreEl;
function analysisHeader(node) {
    if (node.name === 'meta') {
        // name = description, keywords
        if (node.attribs.name === 'description' || node.attribs.name === 'keywords') {
            var content = node.attribs.content;
            if (content) {
                analysisText(content);
            }
        }
    }
    if (node.type === 'text') {
        resolveTextNode(node.data);
    }
    if (node.children && !ignoreEl(node)) {
        node.children.forEach(function (child) {
            analysisHeader(child);
        });
    }
}
function traverseNodes(node) {
    if (node.name === 'script') {
        return;
    }
    if (node.type === 'text') {
        resolveTextNode(node.data);
    }
    if (node.children && !ignoreEl(node)) {
        node.children.forEach(function (child) {
            traverseNodes(child);
        });
    }
}
function parseHtml(fileText) {
    return __awaiter(this, void 0, void 0, function () {
        var $, dict, _i, wordSet_1, word, template, words, resCN_1, zhJson, enJson, twJson, zhHtml, enHtml, twHtml;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    $ = (0, cheerio_1.load)(fileText);
                    traverseNodes($('body')[0]);
                    analysisHeader($('head')[0]);
                    dict = {};
                    for (_i = 0, wordSet_1 = wordSet; _i < wordSet_1.length; _i++) {
                        word = wordSet_1[_i];
                        dict[word] = {
                            key: (0, uuid_1.v4)(),
                            value: {},
                        };
                    }
                    template = (0, htmlWrite_1.htmlWrite)(fileText, dict);
                    words = Object.keys(dict);
                    if (!(words.length > 0)) return [3 /*break*/, 2];
                    return [4 /*yield*/, translate.deepL.translateText(words, "zh", "en-US")];
                case 1:
                    resCN_1 = _a.sent();
                    words.forEach(function (word, index) {
                        if (resCN_1[index]) {
                            dict[word].value['en'] = resCN_1[index].text;
                            dict[word].value['tw'] = translate.converter(word);
                            dict[word].value['cn'] = word;
                        }
                    });
                    _a.label = 2;
                case 2:
                    zhJson = {};
                    enJson = {};
                    twJson = {};
                    Object.values(dict).forEach(function (word) {
                        zhJson[word.key] = word.value['cn'];
                        enJson[word.key] = word.value['en'];
                        twJson[word.key] = word.value['tw'];
                    });
                    zhHtml = (0, handlebars_1.compile)(template)(zhJson);
                    enHtml = (0, handlebars_1.compile)(template)(enJson);
                    twHtml = (0, handlebars_1.compile)(template)(twJson);
                    return [2 /*return*/, {
                            zh: zhHtml,
                            en: enHtml,
                            tw: twHtml,
                        }];
            }
        });
    });
}
function writeFile(filePath, content) {
    (0, fs_1.writeFileSync)(filePath, content, 'utf-8');
}
function analysisHtml(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var fileText;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fileText = (0, fs_1.readFileSync)(filePath, 'utf-8');
                    return [4 /*yield*/, parseHtml(fileText)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
var basicPath = "";
var basePathMap = {};
function checkDir(basePath) {
    // 相对根目录的路径为
    var relativePath = basePath.replace(basicPath, "");
    // 目标路径
    Object.keys(basePathMap).forEach(function (key) {
        var newPath = (0, path_1.join)(basePathMap[key], relativePath);
        if (!(0, fs_1.existsSync)(newPath)) {
            (0, fs_1.mkdirSync)(newPath);
        }
    });
    return relativePath;
}
var skipPath = [
    'node_modules',
    '.git',
    '.vscode',
    '.idea',
];
function syncFolder(basePath) {
    return __awaiter(this, void 0, void 0, function () {
        var relativePath, files, _loop_1, _i, files_1, file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    relativePath = checkDir(basePath);
                    files = (0, fs_1.readdirSync)(basePath, { withFileTypes: true });
                    _loop_1 = function (file) {
                        var folderPath, filePath, fileObject_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    if (!file.isDirectory()) return [3 /*break*/, 2];
                                    folderPath = (0, path_1.join)(basePath, file.name);
                                    if (skipPath.includes(file.name)) {
                                        return [2 /*return*/, "continue"];
                                    }
                                    return [4 /*yield*/, syncFolder(folderPath)];
                                case 1:
                                    _b.sent();
                                    _b.label = 2;
                                case 2:
                                    if (!file.isFile()) return [3 /*break*/, 5];
                                    if (!file.name.endsWith(".html")) return [3 /*break*/, 4];
                                    filePath = (0, path_1.join)(basePath, file.name);
                                    return [4 /*yield*/, analysisHtml(filePath)];
                                case 3:
                                    fileObject_1 = _b.sent();
                                    if (fileObject_1) {
                                        Object.keys(fileObject_1).forEach(function (key) {
                                            var sourceFilePath = (0, path_1.join)(basePathMap[key], relativePath, file.name);
                                            writeFile(sourceFilePath, fileObject_1[key]);
                                        });
                                    }
                                    return [3 /*break*/, 5];
                                case 4:
                                    Object.keys(basePathMap).forEach(function (key) {
                                        var sourceFilePath = (0, path_1.join)(basePathMap[key], relativePath, file.name);
                                        var filePath = (0, path_1.join)(basePath, file.name);
                                        (0, fs_1.copyFileSync)(filePath, sourceFilePath);
                                    });
                                    _b.label = 5;
                                case 5: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, files_1 = files;
                    _a.label = 1;
                case 1:
                    if (!(_i < files_1.length)) return [3 /*break*/, 4];
                    file = files_1[_i];
                    return [5 /*yield**/, _loop_1(file)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function analysisFolder(folderPath, config) {
    return __awaiter(this, void 0, void 0, function () {
        var basePath, distPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    translate = config;
                    basePath = folderPath.split('/').slice(0, -1).join('/');
                    basicPath = folderPath;
                    distPath = (0, path_1.join)(basePath, "dist");
                    if (!(0, fs_1.existsSync)(distPath)) {
                        (0, fs_1.mkdirSync)(distPath);
                    }
                    basePathMap.zh = (0, path_1.join)(distPath, 'zh');
                    basePathMap.en = (0, path_1.join)(distPath, 'en');
                    basePathMap.tw = (0, path_1.join)(distPath, 'tw');
                    Object.keys(basePathMap).forEach(function (key) {
                        if (!(0, fs_1.existsSync)(basePathMap[key])) {
                            (0, fs_1.mkdirSync)(basePathMap[key]);
                        }
                    });
                    return [4 /*yield*/, syncFolder(folderPath)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.analysisFolder = analysisFolder;
