/**

 * Test functional k6: ngữ nghĩa merge extractor ở các step chạy đồng thời.

 *

 * Xác minh rằng khi nhiều step song song extract cùng một khóa trong `ctx`,

 * step được khai báo sau sẽ ghi đè giá trị trước đó.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, resetCounters, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: extractor trong block concurrent ghi đè theo đúng thứ tự khai báo",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "concurrent-extractor-overwrite.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);

      assert.match(output, /FT_CONCURRENT_OVERWRITE_OK sharedKey=B/, `expected overwrite marker\n${output}`);

      assert.equal(started.counters["POST /concurrent-a"] || 0, 1, `expected concurrent-a once\n${output}`);

      assert.equal(started.counters["POST /concurrent-b"] || 0, 1, `expected concurrent-b once\n${output}`);

      assert.equal(started.counters["POST /use-shared"] || 0, 1, `expected use-shared once\n${output}`);

    } finally {

      await started.close();

    }

  },

);



