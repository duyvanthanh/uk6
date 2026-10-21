/**

 * Test functional k6: Flow tiếp tục chạy khi có step lỗi.

 *

 * Xác minh `Flow({ continueOnFailure: true })` vẫn chạy các step phía sau

 * ngay cả khi một step trước đó bị fail.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, resetCounters, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: Flow continueOnFailure=true vẫn chạy các step phía sau",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "flow-continue-on-failure.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);

      assert.match(output, /FT_CONTINUE_OK/, `expected marker\n${output}`);

      assert.equal(started.counters["GET /fail"] || 0, 1, `expected failing step called\n${output}`);

      assert.equal(started.counters["GET /after"] || 0, 1, `expected after step called\n${output}`);

    } finally {

      await started.close();

    }

  },

);



