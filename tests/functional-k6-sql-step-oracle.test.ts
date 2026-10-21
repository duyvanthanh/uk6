import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import {

  buildFunctionalK6Env,

  getFunctionalK6Config,

  resetCounters,

  runProcess,

  startFunctionalMockServer,

} from "./_functional-k6-harness";



test(

  "functional: SQL step hoạt động trong createScenario/Flow (mock DB, không cần Oracle)",

  {

    skip: getFunctionalK6Config().skipReason,

  },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "sql-step-mockdb.js");

      const env = buildFunctionalK6Env(started.baseUrl);



      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 30_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);

      assert.match(output, /FT_SQL_MOCKDB_OK/, "expected SQL marker in output");

    } finally {

      await started.close();

    }

  },

);

