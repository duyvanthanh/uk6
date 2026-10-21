/**

 * Test functional k6: điều phối `createScenario`

 * (`setups -> flow -> concurrent -> teardowns`).

 *

 * Xác minh luồng chạy "happy path" hoạt động đúng khi `k6 run` thật gọi vào mock API:

 * - `setups(...)` chạy một lần và tạo ra `ctx`

 * - các step trong `flow(...)` tuần tự được thực thi

 * - `concurrent(...)` chạy qua `http.batch`

 * - `teardowns(...)` chạy một lần

 * - các step có `load: 0` sẽ không bao giờ chạy

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import {

  buildFunctionalK6Env,

  getFunctionalK6Config,

  resetCounters,

  runProcess,

  startFunctionalMockServer,

} from "./_functional-k6-harness";



test(

  "functional: setups/flow/concurrent/teardowns chạy đúng với k6 thật",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "plan-happy.js");

      const env = buildFunctionalK6Env(started.baseUrl);



      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);

      assert.match(output, /FT_SETUP_OK/, "expected setup marker in output");

      assert.match(output, /FT_TEARDOWN_OK/, "expected teardown marker in output");

      assert.doesNotMatch(output, /\bFailures:\b/, `did not expect empty failure summary when steps are only load-gated\n${output}`);



      assert.equal(started.counters["POST /login"] || 0, 1, `setup login should run once\n${output}`);

      assert.equal(started.counters["POST /api1"] || 0, 1, `seq api1 should run per iteration\n${output}`);

      assert.equal(started.counters["POST /api2"] || 0, 2, `api2 should be called in concurrent+seq per iteration\n${output}`);

      assert.equal(started.counters["POST /api-skip"] || 0, 0, `load=0 step should never run\n${output}`);

      assert.equal(started.counters["POST /teardown"] || 0, 1, `teardown should run once\n${output}`);

    } finally {

      await started.close();

    }

  },

);

