import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: bodyEncoder encodeFormBody serialize form body đúng định dạng",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "endpoint-form-encoder.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, output);

      assert.match(output, /FT_FORM_BODY_OK raw=a=1&b=hello%20world/);

    } finally {

      await started.close();

    }

  },

);

