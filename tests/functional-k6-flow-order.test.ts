import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: các step trong flow chạy từ trên xuống dưới",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "flow-order.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, output);

      assert.match(output, /FT_FLOW_ORDER_OK/);

      const interesting = started.events

        .filter((item) => item.routeKey.startsWith("POST /echo?step="))

        .map((item) => item.routeKey);

      assert.deepEqual(interesting, ["POST /echo?step=1", "POST /echo?step=2", "POST /echo?step=3"]);

    } finally {

      await started.close();

    }

  },

);

