/**

 * Test distributed listener: kiểm tra claim variant.

 *

 * Xác minh rằng khi request bao gồm `variant.fileRel

 * claim metadata trong `<shared>/.uk6-distributed/runs/<runId>/variant-claims/`.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as path from "node:path";

import { spawnSync } from "node:child_process";

import { mkTempDir, writeFile } from "./_k6-tools-distributed-harness";



test("k6-tools: distributed variant claim đúng một dòng cho mỗi agent", () => {

  const repoRoot = path.resolve(__dirname, "../../..");

  const listenerJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "distributed-listener.js");



  const sharedDir = mkTempDir("uk6-dist-variant-shared-");

  const agent1Dir = mkTempDir("uk6-dist-variant-agent1-");

  const agent2Dir = mkTempDir("uk6-dist-variant-agent2-");



  try {

    const internalRoot = path.join(sharedDir, ".uk6-distributed");

    const requestsDir = path.join(internalRoot, "requests");

    const variantsDir = path.join(internalRoot, "variants");

    fs.mkdirSync(requestsDir, { recursive: true });

    fs.mkdirSync(variantsDir, { recursive: true });



    const runId = "variantRun1";

    const variantRel = path.posix.join("variants", `${runId}.txt`);

    writeFile(path.join(internalRoot, ...variantRel.split("/")), [JSON.stringify({ USER_ID: "user-a" }), JSON.stringify({ USER_ID: "user-b" })].join("\n"));



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

          argv: ["tests/entry.js", "--k6=local", "--start-at-epoch-ms=1", "-e", "USER_ID=user-c"],

          workspace: { schemaVersion: 1, baseDir: path.join("workspaces", runId, "base") },

          variant: { schemaVersion: 1, fileRel: variantRel },

        },

        null,

        2,

      ),

    );



    const variantAbs = path.resolve(internalRoot, variantRel);

    assert.ok(fs.existsSync(variantAbs), `expected variant file to exist at ${variantAbs}`);

    const variantBytes = fs.readFileSync(variantAbs, "utf8");

    assert.ok(variantBytes.includes("USER_ID"), `expected variant file to be readable. content=${JSON.stringify(variantBytes)}`);



    writeFile(path.join(internalRoot, "runs", runId, "nodes", "n1", "status.json"), JSON.stringify({ state: "scheduled" }, null, 2));

    writeFile(path.join(internalRoot, "runs", runId, "nodes", "n2", "status.json"), JSON.stringify({ state: "scheduled" }, null, 2));



    const r1 = spawnSync(process.execPath, [listenerJs, `--distributed=${sharedDir}`, "--once", "--agent-id=a1", "--node-id=n1"], {

      cwd: agent1Dir,

      env: process.env,

      encoding: "utf8",

    });

    const r1Out = `${r1.stdout || ""}\n${r1.stderr || ""}`.trim();

    assert.equal(r1.status, 0, r1Out);



    const r2 = spawnSync(process.execPath, [listenerJs, `--distributed=${sharedDir}`, "--once", "--agent-id=a2", "--node-id=n2"], {

      cwd: agent2Dir,

      env: process.env,

      encoding: "utf8",

    });

    const r2Out = `${r2.stdout || ""}\n${r2.stderr || ""}`.trim();

    assert.equal(r2.status, 0, r2Out);



    const claimsDir = path.join(internalRoot, "runs", runId, "variant-claims");

    assert.ok(fs.existsSync(claimsDir), "expected variant-claims dir to be created");



    const agentClaimA1Path = path.join(claimsDir, "agent-a1.json");

    const agentClaimA2Path = path.join(claimsDir, "agent-a2.json");

    assert.ok(fs.existsSync(agentClaimA1Path), `expected agent-a1.json to exist. dir=${fs.readdirSync(claimsDir).join(",")}\n${r1Out}`);

    assert.ok(fs.existsSync(agentClaimA2Path), `expected agent-a2.json to exist. dir=${fs.readdirSync(claimsDir).join(",")}\n${r2Out}`);



    const c1 = JSON.parse(fs.readFileSync(agentClaimA1Path, "utf8"));

    const c2 = JSON.parse(fs.readFileSync(agentClaimA2Path, "utf8"));

    assert.ok(Number.isFinite(c1?.lineIndex), `expected a1 claim lineIndex. claim=${JSON.stringify(c1, null, 2)}`);

    assert.ok(Number.isFinite(c2?.lineIndex), `expected a2 claim lineIndex. claim=${JSON.stringify(c2, null, 2)}`);

    assert.notEqual(c1.lineIndex, c2.lineIndex, `expected different claimed lines.\na1=${JSON.stringify(c1, null, 2)}\na2=${JSON.stringify(c2, null, 2)}`);

  } finally {

    fs.rmSync(sharedDir, { recursive: true, force: true });

    fs.rmSync(agent1Dir, { recursive: true, force: true });

    fs.rmSync(agent2Dir, { recursive: true, force: true });

  }

});

