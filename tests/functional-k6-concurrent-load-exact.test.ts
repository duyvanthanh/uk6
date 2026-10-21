/**

 * Test functional k6: gate `loadMode=exact` trong block chạy đồng thời (`http.batch`).

 *

 * Xác minh gate theo từng step hoạt động đúng trong nhóm concurrent:

 * có step chạy cho mọi VU, và có step chỉ chạy cho đúng một tỷ lệ VU xác định.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, resetCounters, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: concurrent loadMode=exact gate từng step đúng trong http.batch",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "concurrent-load-exact.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);

      assert.equal(started.counters["POST /api2"] || 0, 10, `expected 10/10 VUs to hit /api2\n${output}`);

      assert.equal(started.counters["POST /api1"] || 0, 5, `expected exactly 5/10 VUs to hit /api1\n${output}`);

    } finally {

      await started.close();

    }

  },

);



