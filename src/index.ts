import { join } from "path";
import {analysisHtml} from "./htmlParse";
function test() {
    const filePath = join(__dirname, "./zzz.html");
    analysisHtml(filePath);
}

test()
