/**

 * Test phía Node cho k6-tools: `uk6 --inspect` với script không hợp lệ phải

 * thoát với mã khác 0 và hiển thị lỗi runtime của k6 trong output.

 *

 * Hiện tại chế độ inspect chưa sinh artifact log lỗi riêng.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import * as fs from "node:fs";

import { spawnSync } from "node:child_process";



test("k6-tools: uk6 --inspect ghi error log khi thất bại", () => {

  const repoRoot = path.resolve(__dirname, "../../..");

  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");

  const scriptPath = path.join(repoRoot, "tests", "functional-k6", "load-invalid.js");



  const outDir = path.join(

    repoRoot,

    "dist",

    "tmp-test",

    `inspect-error-${Date.now()}-${Math.random().toString(16).slice(2)}`,

  );

  fs.mkdirSync(outDir, { recursive: true });



  try {

    const result = spawnSync(process.execPath, [runJs, "--inspect", scriptPath, `--out=${outDir}`], {

      encoding: "utf8",

      cwd: repoRoot,

    });

    const output = `${result.stdout || ""}\n${result.stderr || ""}`;

    assert.notEqual(result.status, 0, "Expected non-zero exit for invalid script");

    assert.match(output, /\[uk6\] k6 inspect failed/, output);



    const errLogPath = path.join(outDir, "k6.inspect.error.log");

    assert.ok(fs.existsSync(errLogPath), `Missing ${errLogPath}`);

    const errLog = fs.readFileSync(errLogPath, "utf8");

    assert.match(errLog, /=== stderr ===|=== stdout ===/, "Expected stderr/stdout sections");

    assert.match(errLog, /Invalid load for step/, "Expected k6 script error in log");

  } finally {

    try {

      fs.rmSync(outDir, { recursive: true, force: true });

    } catch (_) {

      // 

    }

  }

});

