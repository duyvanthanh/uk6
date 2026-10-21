import * as fs from "node:fs";

import { aggregateApiCalls } from "./api/aggregateApiCalls.js";

import { renderDashboardHtml } from "./render/renderDashboardHtml.js";



/**

 * Tạo file dashboard HTML từ raw JSON logs của k6 (được emit bởi `Flow`/scenario runner).

 *

 * Thường dùng qua CLI: `uk6 <script> --dashboard=true`.

 *

 * @param rawEntries Mảng log entries (đã parse từ JSON).

 * @param outputFile Đường dẫn file HTML output.

 */

export function generateRawDashboard(rawEntries: any, outputFile: any) {

    const summary = aggregateApiCalls(rawEntries);

    const html = renderDashboardHtml(summary, []);

    fs.writeFileSync(outputFile, html, 'utf8');

    return summary;

}

