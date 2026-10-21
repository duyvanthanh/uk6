/**

 * Test distributed listener: danh sách agent.

 *

 * Xác minh `distributed-listener --list` hiển thị trạng thái online/offline của agent dựa trên TTL.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as path from "node:path";

import { spawnSync } from "node:child_process";

import { mkTempDir, writeFile } from "./_k6-tools-distributed-harness";



test("k6-tools: distributed listener --list in đúng trạng thái agent online/offline", () => {

  const repoRoot = path.resolve(__dirname, "../../..");

  const listenerJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "distributed-listener.js");



  const listenerDir = mkTempDir("uk6-dist-list-");

  const sharedDir = mkTempDir("uk6-dist-list-shared-");



  try {

    const agentsDir = path.join(sharedDir, ".uk6-distributed", "agents");

    fs.mkdirSync(agentsDir, { recursive: true });



    const now = Date.now();

    writeFile(path.join(agentsDir, "a1.json"), JSON.stringify({ agentId: "a1", nodeId: "n1", lastSeenEpochMs: now, state: "idle" }, null, 2));

    writeFile(

      path.join(agentsDir, "a2.json"),

      JSON.stringify({ agentId: "a2", nodeId: "n2", lastSeenEpochMs: now - 999999, state: "idle" }, null, 2),

    );



    const res = spawnSync(process.execPath, [listenerJs, `--distributed=${sharedDir}`, "--list", "--agent-ttl-ms=2000"], {

      cwd: listenerDir,

      env: process.env,

      encoding: "utf8",

    });

    const out = `${res.stdout || ""}\n${res.stderr || ""}`;

    assert.equal(res.status, 0, out);

    assert.ok(out.includes("online=1"), out);

    assert.ok(out.includes("offline=1"), out);

    assert.ok(out.includes("agentId=a1"), out);

    assert.ok(out.includes("agentId=a2"), out);

  } finally {

    fs.rmSync(listenerDir, { recursive: true, force: true });

    fs.rmSync(sharedDir, { recursive: true, force: true });

  }

});

