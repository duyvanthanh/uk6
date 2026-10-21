import * as fs from "node:fs";
import * as http from "node:http";

import { renderDashboardHtml } from "../../raw-dashboard/render/renderDashboardHtml.js";

function injectLiveScript(html: string, statusUrl: string) {
    const script = `<script>
window.__UK6_LIVE__={statusUrl:${JSON.stringify(statusUrl)},rawUrl:'/api/raw'};
</script>`;
    return html.includes("</body>") ? html.replace("</body>", `${script}</body>`) : `${html}${script}`;
}

export async function startDashboardServer(params: {
    host?: string;
    dashboardFile: string;
    rawLogFile: string;
    rawLogJsFile: string;
    getHtml: () => string;
    getRawEntries: () => any[];
    getStatus: () => any;
}) {
    const host = params.host || "127.0.0.1";

    const server = http.createServer((req, res) => {
        const url = req.url || "/";
        if (url === "/" || url.startsWith("/index.html")) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(injectLiveScript(params.getHtml(), "/api/status"));
            return;
        }

        if (url === "/api/status") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(params.getStatus()));
            return;
        }

        if (url === "/api/raw" || url === "/error_log.raw.json") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(params.getRawEntries()));
            return;
        }

        if (url === "/error_log.raw.js") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/javascript; charset=utf-8");
            res.end(`window.__RAW_LOG_DATA__ = ${JSON.stringify(params.getRawEntries())};\n`);
            return;
        }

        if (url === "/api_dashboard.html" && fs.existsSync(params.dashboardFile)) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(fs.readFileSync(params.dashboardFile, "utf8"));
            return;
        }

        if (url === "/raw-file" && fs.existsSync(params.rawLogFile)) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(fs.readFileSync(params.rawLogFile, "utf8"));
            return;
        }

        if (url === "/raw-js-file" && fs.existsSync(params.rawLogJsFile)) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/javascript; charset=utf-8");
            res.end(fs.readFileSync(params.rawLogJsFile, "utf8"));
            return;
        }

        res.statusCode = 404;
        res.end("Not found");
    });

    await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, host, () => resolve());
    });

    const address = server.address();
    const port = address && typeof address === "object" ? address.port : 0;
    const dashboardUrl = `http://${host}:${port}/`;

    return {
        dashboardUrl,
        close() {
            return new Promise<void>((resolve) => {
                server.close(() => resolve());
            });
        },
    };
}

export function buildDashboardHtml(params: {
    rawEntries: any[];
    aggregateApiCalls: (entries: any[]) => any;
}) {
    const { rawEntries, aggregateApiCalls } = params;
    const summary = aggregateApiCalls(rawEntries);
    return renderDashboardHtml(summary, []);
}
