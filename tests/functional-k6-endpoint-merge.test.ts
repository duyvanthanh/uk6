/**

 * Test functional k6: `EndpointFactory` deep-merge và encode query trên URL.

 *

 * Xác minh hành vi của `createEndpoint()` trong runtime k6 thật:

 * - query params được encode và gắn vào URL

 * - body mặc định được deep-merge với phần override (object + array merge theo index)

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, resetCounters, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: createEndpoint deep-merge body và encode query đúng",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "endpoint-merge.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);



      assert.match(

        output,

        /FT_MERGE_OK nestedX=1 nestedY=999 arr0id=1 arr0v=10 arr1id=2 arr1v=2/,

        `expected merge marker\n${output}`,

      );

      assert.equal(started.counters["POST /merge?q=hello%20world&page=1"] || 0, 1, `expected encoded query\n${output}`);

    } finally {

      await started.close();

    }

  },

);



