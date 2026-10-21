import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: preprocessor đọc được ctx key đang có và xử lý fallback khi thiếu key",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "preprocessor-ctx.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, output);

      assert.match(output, /FT_PREPROCESSOR_CTX_OK/);



      const firstEchoHeaders = started.headers["POST /echo"]?.[0];

      const firstEchoBody = JSON.parse(String(started.bodies["POST /echo"]?.[0] || "{}"));

      const secondEchoBody = JSON.parse(String(started.bodies["POST /echo"]?.[1] || "{}"));



      assert.equal(firstEchoHeaders?.authorization, "Bearer ft-session");

      assert.equal(firstEchoBody.sessionId, "ft-session");

      assert.equal(secondEchoBody.fallback, "MISSING");

    } finally {

      await started.close();

    }

  },

);

