/**

 * Test functional k6: gate `loadMode=exact` trong flow tuần tự.

 *

 * Xác minh cơ chế chia lát VU chính xác để gate step theo cách xác định trước

 * (ví dụ đúng 5/10 VU chạy step đó).

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, resetCounters, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: loadMode=exact chạy đúng tỷ lệ active VU",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "load-exact.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);

      assert.equal(started.counters["GET /load-exact"] || 0, 5, `expected exactly 5/10 VUs to hit /load-exact\n${output}`);

    } finally {

      await started.close();

    }

  },

);



