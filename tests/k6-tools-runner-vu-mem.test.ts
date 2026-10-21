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



function createNodeStubK6(projectDir: string, captureFile: string) {

  const stubDir = path.join(projectDir, "stub-bin");

  fs.mkdirSync(stubDir, { recursive: true });

  const stubJs = path.join(stubDir, "k6-stub.js");

  writeFile(

    stubJs,

    `

const fs = require("fs");

const path = require("path");

const captureFile = process.argv[2];

const args = process.argv.slice(3);

fs.writeFileSync(captureFile, JSON.stringify({ args, env: process.env }, null, 2), "utf8");

fs.writeFileSync("error_log.raw.json", "", "utf8");

const summaryArg = args.find((item) => item.startsWith("--summary-export="));

if (summaryArg) {

  const summaryPath = summaryArg.slice("--summary-export=".length);

  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });

  fs.writeFileSync(summaryPath, JSON.stringify({ metrics: { vus_max: { max: 3 } } }), "utf8");

}

`,

  );

  writeK6Launcher(stubDir, stubJs, [captureFile]);

  return stubDir;

}



test("k6-tools: --vu-mem bổ sung đúng cờ summary export cho k6", () => {

  const repoRoot = path.resolve(__dirname, "../../..");

  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");

  const projectDir = mkTempDir("uk6-vu-mem-");



  try {

    writeFile(path.join(projectDir, "tests", "entry.js"), "export const options={}; export default function(){};\n");

    const captureFile = path.join(projectDir, "captured.json");

    const stubDir = createNodeStubK6(projectDir, captureFile);

    const env = { ...process.env, PATH: `${stubDir}${path.delimiter}${process.env.PATH || ""}` };



    const result = spawnSync(process.execPath, [runJs, "tests/entry.js", "--k6=local", "--vu-mem"], {

      cwd: projectDir,

      env,

      encoding: "utf8",

    });

    const output = `${result.stdout || ""}\n${result.stderr || ""}`;

    assert.equal(result.status, 0, output);



    const captured = JSON.parse(fs.readFileSync(captureFile, "utf8"));

    assert.ok(captured.args.includes("--new-machine-readable-summary"), JSON.stringify(captured, null, 2));

    assert.ok(

      captured.args.some((item: string) => item.startsWith("--summary-export=")),

      JSON.stringify(captured, null, 2),

    );

  } finally {

    fs.rmSync(projectDir, { recursive: true, force: true });

  }

});

