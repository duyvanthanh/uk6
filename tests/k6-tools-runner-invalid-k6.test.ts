/**

 * Test phía Node cho k6-tools: runner kiểm tra hợp lệ của `--k6`.

 *

 * Xác minh các giá trị `--k6=` không hợp lệ sẽ bị từ chối với thông báo lỗi rõ ràng.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { spawnSync } from "node:child_process";



test("k6-tools: uk6 runner từ chối giá trị --k6 không hợp lệ", () => {

  const repoRoot = path.resolve(__dirname, "../../..");

  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");



  const scriptPath = path.join(repoRoot, "tests", "functional-k6", "plan-happy.js");

  const result = spawnSync(process.execPath, [runJs, scriptPath, "--k6=bad"], { encoding: "utf8", cwd: repoRoot });

  const output = `${result.stdout || ""}\n${result.stderr || ""}`;

  assert.notEqual(result.status, 0, output);

  assert.match(output, /Invalid value for --k6/);

});

