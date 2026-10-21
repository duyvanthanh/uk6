/**

 * Test functional k6: extractor dạng string dot-path + `skipOn`.

 *

 * Xác minh:

 * - `extractors` của step chấp nhận string dot-path và ghi vào `ctx`

 * - `skipOn(ctx)` ngăn request HTTP của step đó

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, resetCounters, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: extractor string path của step hoạt động và skipOn bỏ qua request",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "step-extractors-string-and-skipon.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);

      assert.match(output, /FT_STEP_EXTRACT_OK id=abc123/, `expected extract marker\n${output}`);

      assert.match(output, /FT_USE_ID_OK/, `expected marker\n${output}`);

      assert.equal(started.counters["GET /data"] || 0, 1, `expected /data once\n${output}`);

      assert.equal(started.counters["GET /skip-me"] || 0, 0, `expected skipOn to skip /skip-me\n${output}`);

      assert.equal(started.counters["POST /use-id"] || 0, 1, `expected /use-id once\n${output}`);

    } finally {

      await started.close();

    }

  },

);



