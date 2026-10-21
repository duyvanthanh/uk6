/**

 * Test distributed mode ở phía initiator: phát request và publish artifact.

 *

 * Xác minh `uk6 run --distributed=<shared>`:

 * - phát ra request JSON mà không giữ `--distributed` trong `argv`

 * - publish base workspace tới `<shared>/.uk6-distributed/workspaces/<runId>/base`

 * - sao chép dashboard artifact vào `<shared>/.uk6-distributed/reports/<runId>/<nodeId>`

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as path from "node:path";

import { spawnSync } from "node:child_process";

import { mkTempDir, writeFile } from "./_k6-tools-distributed-harness";



test("k6-tools: --distributed phát request và chép dashboard artifact vào shared folder", () => {

  const repoRoot = path.resolve(__dirname, "../../..");

  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");



  const initiatorDir = mkTempDir("uk6-dist-initiator-");

  const sharedDir = mkTempDir("uk6-dist-shared-");



  function rmRfWithRetry(dir: string) {

    for (let i = 0; i < 8; i++) {

      try {

        fs.rmSync(dir, { recursive: true, force: true });

        return;

      } catch (e: any) {

        const code = e?.code;

        if (code !== "ENOTEMPTY" && code !== "EBUSY" && code !== "EPERM") throw e;

        // Trên Windows đôi khi handle còn bị giữ ngắn hạn bởi AV/indexer. Retry một chút để ổn định hơn.

        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);

      }

    }

    fs.rmSync(dir, { recursive: true, force: true });

  }



  try {

    writeFile(path.join(initiatorDir, "tests", "entry.js"), "export const options={}; export default function(){};\n");



    const stubDir = path.join(initiatorDir, "stub-bin");

    fs.mkdirSync(stubDir, { recursive: true });



    const stubCmd = `@echo off\r

setlocal\r

set LOGFILE=error_log.raw.json\r

> "%LOGFILE%" (\r

  echo {"time":"2026-01-01T00:00:00.000Z","level":"info","msg":{"type":"flow_step_call","stepName":"s1","stepIndex":0,"method":"GET","url":"http://x/ok","tags":{"endpoint":"/ok","method":"GET"},"response":{"status":200,"timings":{"duration":12.3}},"checks":{"status is 200":true}}}\r

)\r

exit /b 0\r

`;

    writeFile(path.join(stubDir, "k6.cmd"), stubCmd);



    const env = {

      ...process.env,

      PATH: `${stubDir};${process.env.PATH || ""}`,

      UK6_BROWSER_OPEN_LOGFILE: path.join(initiatorDir, "browser-opens.log"),

    };



    const runId = "run123";

    const nodeId = "nodeA";



    const result = spawnSync(

      process.execPath,

      [

        runJs,

        "tests/entry.js",

        "--k6=local",

        "--dashboard=true",

        `--distributed=${sharedDir}`,

        "--distributed-delay-ms=0",

        "--distributed-cleanup-after-ms=60000",

        `--distributed-run-id=${runId}`,

        `--distributed-node-id=${nodeId}`,

      ],

      { cwd: initiatorDir, env, encoding: "utf8" },

    );



    const output = `${result.stdout || ""}\n${result.stderr || ""}`;

    assert.equal(result.status, 0, output);



    const requestFile = path.join(sharedDir, ".uk6-distributed", "requests", `${runId}.json`);

    assert.ok(fs.existsSync(requestFile), "expected distributed request file");

    const request = JSON.parse(fs.readFileSync(requestFile, "utf8"));

    assert.equal(request.runId, runId);

    assert.equal(request.cleanupAfterMs, 60000);

    assert.ok(typeof request.expiresAtEpochMs === "number");

    assert.ok(Array.isArray(request.argv), "expected argv array in request");

    assert.ok(!request.argv.some((a: string) => String(a).startsWith("--distributed=")), "request argv should not include --distributed");

    assert.ok(

      request.argv.some((a: string) => String(a).startsWith("--start-at-epoch-ms=")),

      "request argv should include --start-at-epoch-ms",

    );



    const baseWorkspaceEntry = path.join(sharedDir, ".uk6-distributed", "workspaces", runId, "base", "tests", "entry.js");

    assert.ok(fs.existsSync(baseWorkspaceEntry), "expected initiator to publish tests/ into shared workspace");



    const reportHtml = path.join(sharedDir, ".uk6-distributed", "reports", runId, nodeId, "dashboard-report", "api_dashboard.html");

    assert.ok(fs.existsSync(reportHtml), "expected dashboard html copied to shared reports folder");

  } finally {

    rmRfWithRetry(initiatorDir);

    rmRfWithRetry(sharedDir);

  }

});

