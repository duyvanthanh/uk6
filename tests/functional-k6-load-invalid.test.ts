/**

 * Test functional k6: validate giá trị `load` của Flow.

 *

 * Xác minh các giá trị `load` không hợp lệ (`<0` hoặc `>1`) sẽ throw và làm run thất bại.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, resetCounters, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: load không hợp lệ (<0 hoặc >1) sẽ báo lỗi",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "load-invalid.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.notEqual(run.status, 0, `expected non-zero exit\n${output}`);

      assert.match(output, /Invalid load for step/, `expected invalid load error\n${output}`);

    } finally {

      await started.close();

    }

  },

);



