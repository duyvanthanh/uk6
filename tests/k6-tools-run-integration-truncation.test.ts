import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

function mkTempDir(prefix: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(p: string, content: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
}

test("k6-tools: dashboard compact mode keeps status and checks only", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");

  const projectDir = mkTempDir("uk6-run-compact-");
  try {
    writeFile(path.join(projectDir, "tests", "entry.js"), "export const options={}; export default function(){};\n");

    const stubDir = path.join(projectDir, "stub-bin");
    fs.mkdirSync(stubDir, { recursive: true });

    const genJs =
      `const lines=30;\n` +
      `for(let i=0;i<lines;i++){\n` +
      `  const payload=JSON.stringify({type:'flow_step_call',stepName:'s'+i,stepIndex:i,method:'POST',url:'http://x/api',tags:{endpoint:'/api',method:'POST',name:'api'},response:{status:200,timings:{duration:12.3}},checks:{ok:true}}).replace(/"/g,'\\\\\\"');\n` +
      `  console.log('time="2026-01-01T00:00:'+String(i).padStart(2,'0')+'.000Z" level=info msg="'+payload+'" source=console');\n` +
      `}\n`;
    writeFile(path.join(stubDir, "gen.js"), genJs);

    const stubCmd = `@echo off\r
setlocal\r
node "${path.join(stubDir, "gen.js").replace(/\\/g, "\\\\")}"\r
exit /b 0\r
`;
    writeFile(path.join(stubDir, "k6.cmd"), stubCmd);

    const env = {
      ...process.env,
      PATH: `${stubDir};${process.env.PATH || ""}`,
      UK6_BROWSER_OPEN_LOGFILE: path.join(projectDir, "browser-opens.log"),
    };

    const result = spawnSync(process.execPath, [runJs, "tests/entry.js", "--k6=local", "--dashboard=true"], {
      cwd: projectDir,
      env,
      encoding: "utf8",
    });

    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    assert.equal(result.status, 0, output);

    const dashboardRaw = path.join(projectDir, "dashboard-report", "error_log.raw.json");
    assert.ok(fs.existsSync(dashboardRaw), "expected dashboard raw json file");

    const rawArr = JSON.parse(fs.readFileSync(dashboardRaw, "utf8"));
    assert.equal(rawArr.length, 30, "expected all events kept");

    const msg0 = rawArr[0]?.msg;
    const msg25 = rawArr[25]?.msg;
    assert.ok(msg0 && typeof msg0 === "object", "expected msg object");
    assert.ok(msg25 && typeof msg25 === "object", "expected msg object");

    assert.equal(msg0.request, undefined, "expected compact mode to omit request detail");
    assert.equal(msg0.response?.body, undefined, "expected compact mode to omit response body");
    assert.equal(msg25.request, undefined, "expected later calls omit request detail");
    assert.equal(msg25.response?.body, undefined, "expected later calls omit response body");
    assert.equal(msg25.response?.status, 200, "expected status preserved");
    assert.ok(msg25.response?.timings && typeof msg25.response.timings.duration === "number", "expected duration preserved");
    assert.ok(msg25.checks && msg25.checks.ok === true, "expected checks preserved");
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});
