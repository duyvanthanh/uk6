/**

 * Test functional k6: step tuần tự/song song không còn tự ghi parsed response vào `ctx[step.name]`.

 *

 * Xác minh:

 * - step tuần tự và concurrent để `ctx[step.name]` ở trạng thái chưa được set

 * - extractor khai báo tường minh vẫn cung cấp đủ dữ liệu cho step phía sau

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, resetCounters, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: step flow/concurrent không tự ghi response vào ctx và dùng extractor thay thế",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "flow-response-in-ctx.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;



      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);

      assert.match(output, /FT_FLOW_CTX_STEP_ABSENT loginStep/, `expected flow step ctx to be absent\n${output}`);

      assert.match(output, /FT_FLOW_EXTRACTOR_OK sessionId=ft-session/, `expected flow extractor marker\n${output}`);

      assert.match(output, /FT_CONCURRENT_CTX_STEP_ABSENT A/, `expected concurrent A step ctx to be absent\n${output}`);

      assert.match(output, /FT_CONCURRENT_CTX_STEP_ABSENT B/, `expected concurrent B step ctx to be absent\n${output}`);

      assert.match(output, /FT_CONCURRENT_EXTRACTOR_OK A/, `expected concurrent A extractor marker\n${output}`);

      assert.match(output, /FT_CONCURRENT_EXTRACTOR_OK B/, `expected concurrent B extractor marker\n${output}`);

      assert.match(output, /FT_FLOW_USE_EXTRACTED_SESSION_OK/, `expected marker using extracted sessionId\n${output}`);

      assert.equal(started.counters["POST /login"] || 0, 1, `expected /login once\n${output}`);

      assert.equal(started.counters["POST /concurrent-a"] || 0, 1, `expected /concurrent-a once\n${output}`);

      assert.equal(started.counters["POST /concurrent-b"] || 0, 1, `expected /concurrent-b once\n${output}`);

      assert.equal(started.counters["POST /api1"] || 0, 1, `expected /api1 once\n${output}`);

    } finally {

      await started.close();

    }

  },

);



