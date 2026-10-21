import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: assertResponseTime hoạt động đúng với endpoint có độ trễ thực",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "assert-response-time.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, output);

      assert.match(output, /FT_RT_SUB100=true/);

      assert.match(output, /FT_RT_SUB1000=true/);

      assert.match(output, /FT_RT_OVER100=false/);

      assert.match(output, /FT_RT_OVER500=false/);

      assert.match(output, /FT_RT_OVER1000=false/);

    } finally {

      await started.close();

    }

  },

);

