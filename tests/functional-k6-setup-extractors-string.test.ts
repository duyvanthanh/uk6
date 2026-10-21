/**

 * Test functional k6: extractor ở setup hỗ trợ string dot-path.

 *

 * Xác minh `{ extractors: { key: "a.b.c" } }` hoạt động đúng trong `setupTasks`.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, resetCounters, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: extractor ở setup hỗ trợ string dot-path",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "setup-extractors-string.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);

      assert.match(output, /FT_SETUP_EXTRACTOR_STRING_OK/, `expected marker\n${output}`);

      assert.match(output, /FT_USE_EXTRACTED_OK/, `expected marker\n${output}`);

      assert.equal(started.counters["POST /login-nested"] || 0, 1, `expected nested login once\n${output}`);

      assert.equal(started.counters["POST /use-extracted"] || 0, 1, `expected use-extracted once\n${output}`);

    } finally {

      await started.close();

    }

  },

);



