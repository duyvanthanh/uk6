import { writeK6Launcher } from "./_k6-stub.js";
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

test("k6-tools: dashboard mode keeps full detail for error events", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");
  const projectDir = mkTempDir("uk6-run-err-detail-");

  try {
    writeFile(path.join(projectDir, "tests", "entry.js"), "export const options={}; export default function(){};\n");

    const stubDir = path.join(projectDir, "stub-bin");
    fs.mkdirSync(stubDir, { recursive: true });

    const genJs =
      `const payload=JSON.stringify({type:'flow_step_error',flowName:'f1',stepName:'s1',stepIndex:0,status:500,method:'POST',url:'http://x/fail',tags:{endpoint:'/fail',method:'POST'},checks:{ok:false},request:{headers:{Authorization:'Bearer x'},body:{foo:'bar'},params:{q:1},timeout:30000},response:{status:500,headers:{'content-type':'application/json'},timings:{duration:45.6},remote_ip:'10.0.0.1',remote_port:443,request_url:'http://x/fail',body:'ERR_BODY'}}).replace(/"/g,'\\\\\\"');\n` +
      `console.log('time="2026-01-01T00:00:00.000Z" level=error msg="'+payload+'" source=console');\n`;
    writeFile(path.join(stubDir, "gen.js"), genJs);

    writeK6Launcher(stubDir, path.join(stubDir, "gen.js"));

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

    const dashboardRaw = path.join(projectDir, "dashboard-report", "error_log.raw.json");
    const rawArr = JSON.parse(fs.readFileSync(dashboardRaw, "utf8"));
    assert.equal(rawArr.length, 1);
    const msg = rawArr[0]?.msg;
    assert.equal(msg.type, "flow_step_error");
    assert.deepEqual(msg.request?.body, { foo: "bar" });
    assert.equal(msg.response?.body, "ERR_BODY");
    assert.equal(msg.response?.status, 500);
    assert.equal(msg.checks?.ok, false);
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});
