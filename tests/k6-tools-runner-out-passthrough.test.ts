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

fs.writeFileSync(process.argv[2], JSON.stringify({ args: process.argv.slice(3) }, null, 2), "utf8");

fs.writeFileSync("error_log.raw.json", "", "utf8");

`,

  );

  writeK6Launcher(stubDir, stubJs, [captureFile]);

  return stubDir;

}



test("k6-tools: uk6 truyền --out xuống k6 nguyên vẹn", () => {

  const repoRoot = path.resolve(__dirname, "../../..");

  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");

  const projectDir = mkTempDir("uk6-out-pass-");



  try {

    writeFile(path.join(projectDir, "tests", "entry.js"), "export const options={}; export default function(){};\n");

    const captureFile = path.join(projectDir, "captured.json");

    const stubDir = createNodeStubK6(projectDir, captureFile);

    const env = { ...process.env, PATH: `${stubDir}${path.delimiter}${process.env.PATH || ""}` };



    const result = spawnSync(

      process.execPath,

      [runJs, "tests/entry.js", "--k6=local", "--out=influxdb=http://127.0.0.1:8086/k6"],

      { cwd: projectDir, env, encoding: "utf8" },

    );

    const output = `${result.stdout || ""}\n${result.stderr || ""}`;

    assert.equal(result.status, 0, output);



    const captured = JSON.parse(fs.readFileSync(captureFile, "utf8"));

    assert.ok(

      captured.args.includes("--out=influxdb=http://127.0.0.1:8086/k6"),

      JSON.stringify(captured, null, 2),

    );

  } finally {

    fs.rmSync(projectDir, { recursive: true, force: true });

  }

});

