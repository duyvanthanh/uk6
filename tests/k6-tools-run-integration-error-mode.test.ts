import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawn, spawnSync } from "node:child_process";

function mkTempDir(prefix: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

async function rmRfWithRetry(dir: string, retries = 60, delayMs = 100) {
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

async function waitFor(predicate: () => boolean, timeoutMs = 5000, intervalMs = 50) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return predicate();
}

test("k6-tools: --error writes only failure entries without dashboard artifacts", async () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");
  const projectDir = mkTempDir("uk6-run-error-");

  try {
    writeFile(path.join(projectDir, "tests", "entry.js"), "export const options={}; export default function(){};\n");

    const stubDir = path.join(projectDir, "stub-bin");
    fs.mkdirSync(stubDir, { recursive: true });

    const stubCmd = `@echo off\r
setlocal\r
echo time^="2026-01-01T00:00:00.000Z" level^=info msg^="{\\\"type\\\":\\\"flow_step_call\\\",\\\"stepName\\\":\\\"s1\\\",\\\"stepIndex\\\":0,\\\"method\\\":\\\"GET\\\",\\\"url\\\":\\\"http://x/ok\\\",\\\"request\\\":{\\\"headers\\\":{\\\"Accept\\\":\\\"application/json\\\"},\\\"body\\\":null,\\\"params\\\":{}},\\\"tags\\\":{\\\"endpoint\\\":\\\"/ok\\\",\\\"method\\\":\\\"GET\\\"},\\\"response\\\":{\\\"status\\\":200,\\\"headers\\\":{\\\"content-type\\\":\\\"application/json\\\"},\\\"timings\\\":{\\\"duration\\\":12.3},\\\"body\\\":\\\"{\\\\\\\"ok\\\\\\\":true}\\\"},\\\"checks\\\":{\\\"status is 200\\\":true}}" source^=console\r
echo time^="2026-01-01T00:00:01.000Z" level^=error msg^="{\\\"type\\\":\\\"flow_step_error\\\",\\\"stepName\\\":\\\"s2\\\",\\\"stepIndex\\\":1,\\\"method\\\":\\\"POST\\\",\\\"url\\\":\\\"http://x/fail\\\",\\\"request\\\":{\\\"headers\\\":{\\\"Content-Type\\\":\\\"application/json\\\"},\\\"body\\\":\\\"{\\\\\\\"foo\\\\\\\":1}\\\",\\\"params\\\":{}},\\\"tags\\\":{\\\"endpoint\\\":\\\"/fail\\\",\\\"method\\\":\\\"POST\\\"},\\\"response\\\":{\\\"status\\\":500,\\\"headers\\\":{\\\"content-type\\\":\\\"application/json\\\"},\\\"timings\\\":{\\\"duration\\\":45.6},\\\"body\\\":\\\"{\\\\\\\"error\\\\\\\":true}\\\"},\\\"checks\\\":{\\\"status is 200\\\":false}}" source^=console\r
echo time^="2026-01-01T00:00:02.000Z" level^=error msg^="{\\\"type\\\":\\\"flow_step_exception\\\",\\\"stepName\\\":\\\"s3\\\",\\\"stepIndex\\\":2,\\\"error\\\":{\\\"message\\\":\\\"boom\\\"}}" source^=console\r
exit /b 0\r
`;
    writeFile(path.join(stubDir, "k6.cmd"), stubCmd);

    const env = {
      ...process.env,
      PATH: `${stubDir};${process.env.PATH || ""}`,
      UK6_BROWSER_OPEN_LOGFILE: path.join(projectDir, "browser-opens.log"),
    };

    const result = spawnSync(process.execPath, [runJs, "tests/entry.js", "--k6=local", "--error=true"], {
      cwd: projectDir,
      env,
      encoding: "utf8",
    });

    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    assert.equal(result.status, 0, output);
    assert.doesNotMatch(output, /Dashboard live:/);

    const errorFile = path.join(projectDir, "error_log.json");
    assert.ok(fs.existsSync(errorFile), "expected error_log.json");
    const entries = JSON.parse(fs.readFileSync(errorFile, "utf8"));
    assert.equal(entries.length, 2);
    assert.equal(entries[0].msg.type, "flow_step_error");
    assert.equal(entries[0].msg.request.body, "{\"foo\":1}");
    assert.equal(entries[0].msg.response.body, "{\"error\":true}");
    assert.equal(entries[1].msg.type, "flow_step_exception");

    assert.ok(!fs.existsSync(path.join(projectDir, "dashboard-report", "api_dashboard.html")), "dashboard html should not exist");
    assert.ok(!fs.existsSync(path.join(projectDir, "dashboard-report", "error_log.raw.json")), "dashboard raw log should not exist");
    assert.ok(!fs.existsSync(path.join(projectDir, "browser-opens.log")), "browser should not be opened");
  } finally {
    await rmRfWithRetry(projectDir);
  }
});

test("k6-tools: --error streams error_log.json before run exits", async () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");
  const projectDir = mkTempDir("uk6-run-error-live-");

  try {
    writeFile(path.join(projectDir, "tests", "entry.js"), "export const options={}; export default function(){};\n");

    const stubDir = path.join(projectDir, "stub-bin");
    fs.mkdirSync(stubDir, { recursive: true });

    const stubCmd = `@echo off\r
setlocal\r
echo time^="2026-01-01T00:00:01.000Z" level^=error msg^="{\\\"type\\\":\\\"flow_step_error\\\",\\\"stepName\\\":\\\"s2\\\",\\\"stepIndex\\\":1,\\\"method\\\":\\\"POST\\\",\\\"url\\\":\\\"http://x/fail\\\",\\\"request\\\":{\\\"headers\\\":{\\\"Content-Type\\\":\\\"application/json\\\"},\\\"body\\\":\\\"{\\\\\\\"foo\\\\\\\":1}\\\",\\\"params\\\":{}},\\\"tags\\\":{\\\"endpoint\\\":\\\"/fail\\\",\\\"method\\\":\\\"POST\\\"},\\\"response\\\":{\\\"status\\\":500,\\\"headers\\\":{\\\"content-type\\\":\\\"application/json\\\"},\\\"timings\\\":{\\\"duration\\\":45.6},\\\"body\\\":\\\"{\\\\\\\"error\\\\\\\":true}\\\"},\\\"checks\\\":{\\\"status is 200\\\":false}}" source^=console\r
ping -n 6 127.0.0.1 >nul\r
exit /b 0\r
`;
    writeFile(path.join(stubDir, "k6.cmd"), stubCmd);

    const env = {
      ...process.env,
      PATH: `${stubDir};${process.env.PATH || ""}`,
      UK6_BROWSER_OPEN_LOGFILE: path.join(projectDir, "browser-opens.log"),
    };

    const child = spawn(process.execPath, [runJs, "tests/entry.js", "--k6=local", "--error=true"], {
      cwd: projectDir,
      env,
      stdio: "pipe",
    });
    let childStdout = "";
    let childStderr = "";
    child.stdout?.on("data", (chunk) => {
      childStdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk) => {
      childStderr += chunk.toString("utf8");
    });

    const errorFile = path.join(projectDir, "error_log.json");
    const fileAppeared = await waitFor(() => fs.existsSync(errorFile), 8000, 50);
    assert.equal(fileAppeared, true, `expected error_log.json to appear before process exit\n${childStdout}\n${childStderr}`);

    const streamedEntries = JSON.parse(fs.readFileSync(errorFile, "utf8"));
    assert.equal(streamedEntries.length, 1);
    assert.equal(streamedEntries[0].msg.type, "flow_step_error");

    child.kill();
    await new Promise<void>((resolve) => child.once("exit", () => resolve()));
  } finally {
    await rmRfWithRetry(projectDir);
  }
});
