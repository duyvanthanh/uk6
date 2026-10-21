import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: createEndpoint shallow-merge headers và params override đúng",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "endpoint-shallow-merge.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, output);

      assert.match(output, /FT_SHALLOW_MERGE_OK/);

      assert.match(output, /mode=override/);

      assert.match(output, /page=1/);

      assert.match(output, /q=hello%20world/);

      assert.match(output, /base=override/);

      assert.match(output, /extra=yes/);

    } finally {

      await started.close();

    }

  },

);

