/** đ .

 * Test phía Node cho k6-tools: output trợ giúp của CLI runner.

 *

 * Xác minh runner `uk6` in phần trợ giúp và các flags quan trọng

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { spawnSync } from "node:child_process";



test("k6-tools: uk6 runner in trợ giúp", () => {

  const repoRoot = path.resolve(__dirname, "../../..");

  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");



  const result = spawnSync(process.execPath, [runJs, "--help"], { encoding: "utf8", cwd: repoRoot });

  const output = `${result.stdout || ""}\n${result.stderr || ""}`;

  assert.equal(result.status, 0, output);
  assert.match(output, /uk6 <script>/);
  assert.match(output, /--k6=project\|local/);
  assert.match(output, /--step-logs=auto\|full\|errors-only\|off/);
  assert.match(output, /--log-console/);
  assert.match(output, /--treeshake\[=true\|false\]/);
  assert.match(output, /--proxy\[=true\|false\]/);
  assert.doesNotMatch(output, /--no-proxy/);
  assert.doesNotMatch(output, /--no-treeshake/);
  assert.doesNotMatch(output, /--remove/);
  assert.doesNotMatch(output, /--ide-remote/);
  assert.doesNotMatch(output, /--beautify/);
});
