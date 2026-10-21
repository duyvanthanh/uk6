/**

 * Test functional k6: Flow mặc định dừng khi gặp lỗi.

 *

 * Xác minh `Flow` dừng các step tiếp theo sau khi response bị fail

 * khi `continueOnFailure=false` (mặc định).

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, resetCounters, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: Flow dừng khi có lỗi theo mặc định của createScenario",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "flow-stop-on-failure.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);



      assert.equal(started.counters["GET /ok"] || 0, 1, `expected first step\n${output}`);

      assert.equal(started.counters["GET /fail"] || 0, 1, `expected failing step\n${output}`);

      assert.equal(started.counters["GET /after"] || 0, 0, `expected stop before after-step\n${output}`);

    } finally {

      await started.close();

    }

  },

);



