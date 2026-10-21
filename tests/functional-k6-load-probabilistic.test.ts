import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { buildFunctionalK6Env, getFunctionalK6Config, runProcess, startFunctionalMockServer } from "./_functional-k6-harness";



test(

  "functional: probabilistic load chạy ít hơn số iteration đã khai báo",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "load-probabilistic.js");

      const env = buildFunctionalK6Env(started.baseUrl);

      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, output);

      const count = started.counters["GET /api1"] || 0;

      assert.ok(count > 0, `expected at least one gated-in iteration\n${output}`);

      assert.ok(count < 30, `expected fewer than declared iterations\ncount=${count}\n${output}`);

    } finally {

      await started.close();

    }

  },

);

