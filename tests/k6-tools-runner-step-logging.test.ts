import { writeK6Stub, logEventCode } from "./_k6-stub.js";
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



function createStubK6(projectDir: string, modeFile: string, emitDashboardLog: boolean) {
  const stubDir = path.join(projectDir, "stub-bin");
  fs.mkdirSync(stubDir, { recursive: true });
  writeK6Stub(stubDir,
    `require("node:fs").writeFileSync(${JSON.stringify(modeFile)}, process.env.UK6_STEP_LOGGING + "|" + process.env.UK6_EVENT_LOG_MODE);\n` +
    (emitDashboardLog ? logEventCode({"type": "flow_step_call", "stepName": "s1", "stepIndex": 0, "method": "GET", "url": "http://x/ok", "tags": {"endpoint": "/ok", "method": "GET"}, "response": {"status": 200, "timings": {"duration": 12.3}, "headers": {"content-type": "application/json"}, "body": "{\"ok\":true}"}, "checks": {"status is 200": true}}, "info", 0) : ""));
  return stubDir;
}



test("k6-tools: runner mặc định chỉ log lỗi và chuyển sang full khi bật dashboard", async () => {
  const repoRoot = path.resolve(__dirname, "../../..");

  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");

  const projectDir = mkTempDir("uk6-step-logging-");



  try {

    writeFile(path.join(projectDir, "tests", "entry.js"), "export const options={}; export default function(){};\n");



    const modeDefaultFile = path.join(projectDir, "mode-default.txt");

    const stubDirDefault = createStubK6(projectDir, modeDefaultFile, false);

    const envDefault = { ...process.env, PATH: `${stubDirDefault}${path.delimiter}${process.env.PATH || ""}` };

    const defaultRun = spawnSync(process.execPath, [runJs, "tests/entry.js", "--k6=local"], {
      cwd: projectDir,
      env: envDefault,
      encoding: "utf8",
    });
    assert.equal(defaultRun.status, 0, `${defaultRun.stdout || ""}\n${defaultRun.stderr || ""}`);
    assert.equal(fs.readFileSync(modeDefaultFile, "utf8").trim(), "off|off");


    const modeDashboardFile = path.join(projectDir, "mode-dashboard.txt");
    const stubDirDashboard = createStubK6(projectDir, modeDashboardFile, true);

    const envDashboard = {
      ...process.env,
      PATH: `${stubDirDashboard}${path.delimiter}${process.env.PATH || ""}`,
      UK6_BROWSER_OPEN_LOGFILE: path.join(projectDir, "browser-opens.log"),
    };
    const dashboardRun = spawnSync(process.execPath, [runJs, "tests/entry.js", "--k6=local", "--dashboard=true"], {
      cwd: projectDir,
      env: envDashboard,
      encoding: "utf8",
    });
    assert.equal(dashboardRun.status, 0, `${dashboardRun.stdout || ""}\n${dashboardRun.stderr || ""}`);
    assert.equal(fs.readFileSync(modeDashboardFile, "utf8").trim(), "errors_only|compact");

    const modeErrorFile = path.join(projectDir, "mode-error.txt");
    const stubDirError = createStubK6(projectDir, modeErrorFile, false);
    const envError = { ...process.env, PATH: `${stubDirError}${path.delimiter}${process.env.PATH || ""}` };
    const errorRun = spawnSync(process.execPath, [runJs, "tests/entry.js", "--k6=local", "--error=true"], {
      cwd: projectDir,
      env: envError,
      encoding: "utf8",
    });
    assert.equal(errorRun.status, 0, `${errorRun.stdout || ""}\n${errorRun.stderr || ""}`);
    assert.equal(fs.readFileSync(modeErrorFile, "utf8").trim(), "full_error_only|full_error_only");
  } finally {
    await rmRfWithRetry(projectDir);
  }
});
