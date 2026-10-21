/**

 * Test functional k6: validate plan.

 *

 * Xác minh `createScenario({ plan })` từ chối vị trí không hợp lệ của `setups(...)` / `teardowns(...)`.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, resetCounters, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: vị trí plan không hợp lệ sẽ báo lỗi",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "plan-invalid-placement.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.notEqual(run.status, 0, `expected non-zero exit\n${output}`);

      assert.match(output, /Invalid plan: setups\(\.\.\.\) must be at the beginning/, "expected plan validation error");

    } finally {

      await started.close();

    }

  },

);



