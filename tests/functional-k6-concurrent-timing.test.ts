import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: block concurrent gửi request gần như cùng thời điểm",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "concurrent-timing.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, output);

      assert.match(output, /FT_CONCURRENT_TIMING_OK/);

      const a = started.events.find((item) => item.routeKey === "GET /delay-500?a=1");

      const b = started.events.find((item) => item.routeKey === "GET /delay-500?b=1");

      assert.ok(a, `missing event for a\n${output}`);

      assert.ok(b, `missing event for b\n${output}`);

      assert.ok(Math.abs((a?.timeMs || 0) - (b?.timeMs || 0)) < 150, `expected near-simultaneous start\n${JSON.stringify(started.events, null, 2)}`);

    } finally {

      await started.close();

    }

  },

);

