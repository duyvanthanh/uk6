/**

 * Test distributed listener: cleanup khi khởi động.

 *

 * Xác minh listener xóa run/report/workspace cũ hơn 1 ngày khi khởi động theo kiểu best-effort.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as path from "node:path";

import { spawnSync } from "node:child_process";

import { mkTempDir } from "./_k6-tools-distributed-harness";



test("k6-tools: listener khi khởi động dọn runs/reports/workspaces cũ hơn 1 ngày", () => {

  const repoRoot = path.resolve(__dirname, "../../..");

  const listenerJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "distributed-listener.js");



  const listenerDir = mkTempDir("uk6-dist-clean-listener-");

  const sharedDir = mkTempDir("uk6-dist-clean-shared-");



  try {

    const internalRoot = path.join(sharedDir, ".uk6-distributed");

    const runsDir = path.join(internalRoot, "runs");

    const reportsDir = path.join(internalRoot, "reports");

    const workspacesDir = path.join(internalRoot, "workspaces");



    const oldRunId = "oldRun1";

    const newRunId = "newRun1";



    const touch = (p: string, whenMs: number) => {

      fs.mkdirSync(path.dirname(p), { recursive: true });

      fs.writeFileSync(p, "x", "utf8");

      const d = new Date(whenMs);

      fs.utimesSync(p, d, d);

    };

    const touchDir = (dirPath: string, whenMs: number) => {

      fs.mkdirSync(dirPath, { recursive: true });

      const d = new Date(whenMs);

      fs.utimesSync(dirPath, d, d);

    };



    const now = Date.now();

    const old = now - 2 * 24 * 60 * 60 * 1000;



    touch(path.join(runsDir, oldRunId, "nodes", "n1", "status.json"), old);

    touch(path.join(reportsDir, oldRunId, "n1", "meta.json"), old);

    touch(path.join(workspacesDir, oldRunId, "base", "uk6-distributed-workspace.json"), old);

    touchDir(path.join(runsDir, oldRunId), old);

    touchDir(path.join(reportsDir, oldRunId), old);

    touchDir(path.join(workspacesDir, oldRunId), old);



    touch(path.join(runsDir, newRunId, "nodes", "n1", "status.json"), now);

    touch(path.join(reportsDir, newRunId, "n1", "meta.json"), now);

    touch(path.join(workspacesDir, newRunId, "base", "uk6-distributed-workspace.json"), now);

    touchDir(path.join(runsDir, newRunId), now);

    touchDir(path.join(reportsDir, newRunId), now);

    touchDir(path.join(workspacesDir, newRunId), now);



    const res = spawnSync(process.execPath, [listenerJs, `--distributed=${sharedDir}`, "--once"], {

      cwd: listenerDir,

      env: process.env,

      encoding: "utf8",

    });

    const out = `${res.stdout || ""}\n${res.stderr || ""}`;

    assert.equal(res.status, 0, out);



    assert.ok(!fs.existsSync(path.join(runsDir, oldRunId)), "expected old runs/<runId> to be deleted");

    assert.ok(!fs.existsSync(path.join(reportsDir, oldRunId)), "expected old reports/<runId> to be deleted");

    assert.ok(!fs.existsSync(path.join(workspacesDir, oldRunId)), "expected old workspaces/<runId> to be deleted");



    assert.ok(fs.existsSync(path.join(runsDir, newRunId)), "expected new runs/<runId> to remain");

    assert.ok(fs.existsSync(path.join(reportsDir, newRunId)), "expected new reports/<runId> to remain");

    assert.ok(fs.existsSync(path.join(workspacesDir, newRunId)), "expected new workspaces/<runId> to remain");

  } finally {

    fs.rmSync(listenerDir, { recursive: true, force: true });

    fs.rmSync(sharedDir, { recursive: true, force: true });

  }

});

