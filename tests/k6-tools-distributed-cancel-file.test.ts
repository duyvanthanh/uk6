/**

 * Test distributed mode ở listener: hủy qua file dùng chung `cancel.json`.

 *

 * Xác minh distributed listener đánh dấu một run là `cancelled`

 * khi `<shared>/.uk6-distributed/runs/<runId>/cancel.json` xuất hiện.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as path from "node:path";

import { spawn } from "node:child_process";

import { killTreeBestEffort, mkTempDir, rmRfRetry, waitExit, waitFor, writeFile } from "./_k6-tools-distributed-harness";



test("k6-tools: file cancel của distributed dừng được listener run", async () => {

  const repoRoot = path.resolve(__dirname, "../../..");

  const listenerJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "distributed-listener.js");



  const listenerDir = mkTempDir("uk6-dist-cancel-listener-");

  const sharedDir = mkTempDir("uk6-dist-cancel-shared-");



  const runId = "cancelRun1";

  const listenerNodeId = "listenerB";

  const agentId = "agent-cancel-test";



  let listenerProc: import("node:child_process").ChildProcess | null = null;



  try {

    writeFile(path.join(listenerDir, "tests", "entry.js"), "export const options={}; export default function(){};\n");



    const stubDir = path.join(listenerDir, "stub-bin");

    fs.mkdirSync(stubDir, { recursive: true });



    const stubCmd = `@echo off\r

setlocal\r

REM sleep ~12s\r

ping 127.0.0.1 -n 12 >nul\r

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

    };



    const lp = spawn(

      process.execPath,

      [listenerJs, `--distributed=${sharedDir}`, "--poll-ms=250", `--agent-id=${agentId}`, `--node-id=${listenerNodeId}`],

      { cwd: listenerDir, env, stdio: "ignore" },

    );

    lp.unref();

    listenerProc = lp;



    const internalRoot = path.join(sharedDir, ".uk6-distributed");

    const baseWorkspaceDir = path.join(internalRoot, "workspaces", runId, "base");

    writeFile(path.join(baseWorkspaceDir, "tests", "entry.js"), "export const options={}; export default function(){};\n");



    const cancelFile = path.join(internalRoot, "runs", runId, "cancel.json");

    const listenerStatusFile = path.join(internalRoot, "runs", runId, "nodes", listenerNodeId, "status.json");



    const requestsDir = path.join(internalRoot, "requests");

    fs.mkdirSync(requestsDir, { recursive: true });

    writeFile(

      path.join(requestsDir, `${runId}.json`),

      JSON.stringify(

        {

          schemaVersion: 1,

          tool: "uk6",

          runId,

          createdAtEpochMs: Date.now(),

          startAtEpochMs: Date.now(),

          cleanupAfterMs: 60000,

          expiresAtEpochMs: Date.now() + 60000,

          argv: ["tests/entry.js", "--k6=local", "--start-at-epoch-ms=1"],

          workspace: { schemaVersion: 1, baseDir: path.join("workspaces", runId, "base") },

        },

        null,

        2,

      ),

    );



    await waitFor(() => {

      if (!fs.existsSync(listenerStatusFile)) return false;

      try {

        const s = JSON.parse(fs.readFileSync(listenerStatusFile, "utf8"));

        return s?.state === "running";

      } catch {

        return false;

      }

    }, { timeoutMs: 15000, stepMs: 250 });



    writeFile(cancelFile, JSON.stringify({ schemaVersion: 1, tool: "uk6", runId, signal: "TEST", cancelledAtEpochMs: Date.now() }, null, 2));



    await waitFor(() => {

      if (!fs.existsSync(listenerStatusFile)) return false;

      try {

        const s = JSON.parse(fs.readFileSync(listenerStatusFile, "utf8"));

        return s?.state === "cancelled";

      } catch {

        return false;

      }

    }, { timeoutMs: 60000, stepMs: 250 });



    lp.kill("SIGTERM");

    await waitExit(lp, 5000).catch(() => {

      killTreeBestEffort(lp);

    });

  } finally {

    if (listenerProc && listenerProc.exitCode == null) {

      killTreeBestEffort(listenerProc);

      await waitExit(listenerProc, 2000).catch(() => {});

    }

    rmRfRetry(listenerDir);

    rmRfRetry(sharedDir);

  }

});

