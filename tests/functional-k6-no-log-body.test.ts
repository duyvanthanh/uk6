/**

 * Test functional k6: endpoint có thể tắt log response body

 * để phù hợp với API download hoặc dữ liệu nhị phân.

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

  "functional: endpoint logResponseBody=false sẽ bỏ responseBody khỏi log",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "no-log-body.js");

      const env = {
        ...buildFunctionalK6Env(started.baseUrl),
        UK6_EVENT_LOG_MODE: "full",
      };
      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);



      assert.equal(started.counters["GET /download"] || 0, 1, `expected GET /download\n${output}`);

      assert.ok(

        output.includes('[response body omitted]'),

        `expected responseBody omitted marker\n${output}`,

      );

    } finally {

      await started.close();

    }

  },

);

