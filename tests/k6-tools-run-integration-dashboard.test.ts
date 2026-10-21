import { writeK6Stub, logEventCode } from "./_k6-stub.js";
/**

 * Test tích hợp phía Node cho k6-tools, không cần binary k6 thật.

 *

 * Xác minh runner có thể:

 * - chạy với binary `k6` giả được chèn vào PATH

 * - tạo `error_log.raw.json`

 * - sinh dashboard HTML khi `--dashboard=true`

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as os from "node:os";

import * as path from "node:path";

import { spawnSync } from "node:child_process";



function mkTempDir(prefix: string) {

  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));

}



async function rmRfWithRetry(dir: string, retries = 20, delayMs = 100) {

  for (let i = 0; i <= retries; i += 1) {

    try {

      fs.rmSync(dir, { recursive: true, force: true });

      return;

    } catch (e: any) {

      const code = e?.code;

      const retryable = code === "EBUSY" || code === "EPERM" || code === "ENOTEMPTY";

      if (!retryable || i === retries) throw e;

      await new Promise((r) => setTimeout(r, delayMs));

    }

  }

}



function writeFile(p: string, content: string) {

  fs.mkdirSync(path.dirname(p), { recursive: true });

  fs.writeFileSync(p, content, "utf8");

}



test("k6-tools: runner sinh dashboard bằng binary k6 giả lập", async () => {
  const repoRoot = path.resolve(__dirname, "../../..");

  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");



  const projectDir = mkTempDir("uk6-run-it-");

  try {

    writeFile(path.join(projectDir, "tests", "entry.js"), "export const options={}; export default function(){};\n");



    const stubDir = path.join(projectDir, "stub-bin");

    fs.mkdirSync(stubDir, { recursive: true });



    writeK6Stub(stubDir,
      logEventCode({"type": "flow_step_call", "stepName": "s1", "stepIndex": 0, "method": "GET", "url": "http://x/ok", "tags": {"endpoint": "/ok", "method": "GET"}, "response": {"status": 200, "timings": {"duration": 12.3}}, "checks": {"status is 200": true}}, "info", 0) +
      logEventCode({"type": "flow_step_error", "stepName": "s2", "stepIndex": 1, "method": "POST", "url": "http://x/fail", "tags": {"endpoint": "/fail", "method": "POST"}, "response": {"status": 500, "timings": {"duration": 45.6}}, "checks": {"status is 200": false}}, "error", 1));



    const env = {
      ...process.env,
      PATH: `${stubDir}${path.delimiter}${process.env.PATH || ""}`,
      UK6_BROWSER_OPEN_LOGFILE: path.join(projectDir, "browser-opens.log"),
    };


    const result = spawnSync(process.execPath, [runJs, "tests/entry.js", "--k6=local", "--dashboard=true"], {

      cwd: projectDir,

      env,

      encoding: "utf8",

    });



    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    assert.equal(result.status, 0, output);
    assert.match(output, /Dashboard live: http:\/\/127\.0\.0\.1:\d+\//);

    const dashboardFile = path.join(projectDir, "dashboard-report", "api_dashboard.html");
    assert.ok(fs.existsSync(dashboardFile), "expected dashboard html file");
    const html = fs.readFileSync(dashboardFile, "utf8");
    assert.match(html, /Performance Dashboard/i);
    assert.ok(!fs.existsSync(path.join(projectDir, ".k6-build")), "expected .k6-build to be removed after run");

    const rawLogFile = path.join(projectDir, "dashboard-report", "error_log.raw.json");
    assert.ok(fs.existsSync(rawLogFile), "expected raw log file kept when dashboard enabled");
    const browserOpens = fs.readFileSync(path.join(projectDir, "browser-opens.log"), "utf8");
    assert.match(browserOpens, /http:\/\/127\.0\.0\.1:\d+\//);
    assert.match(browserOpens, /api_dashboard\.html/);
  } finally {
    await rmRfWithRetry(projectDir);
  }
});
