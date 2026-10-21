/**

 * Test functional k6: preprocessor có thể trả về patch object nhẹ cho endpoint.

 *

 * Xác minh runtime của Flow tái sử dụng endpoint đã cache và áp dụng override cho body/params/header/tag

 * mà không cần tạo `EndpointModel` mới từ endpoint factory.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, resetCounters, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: preprocessor dạng patch áp dụng override lên endpoint cache đúng",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "endpoint-patch.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);

      assert.match(output, /FT_PATCH_OK sessionId=ft-session/, `expected patch marker\n${output}`);

      assert.equal(started.counters["POST /merge?q=patch&page=1"] || 0, 1, `expected patched query\n${output}`);

    } finally {

      await started.close();

    }

  },

);

