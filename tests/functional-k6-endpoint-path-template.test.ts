/**

 * Test functional k6: `createEndpoint` với `pathTemplate` và `pathParams`.

 *

 * Xác minh:

 * - placeholder `{id}` được thay thế và URI-encode trong đường dẫn request thực tế

 * - `tags.endpoint` giữ nguyên dạng template ổn định, không bung ra theo id runtime

 */

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

  "functional: createEndpoint pathTemplate thay params và giữ endpoint tag ổn định",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "endpoint-path-template.js");

      const env = {
        ...buildFunctionalK6Env(started.baseUrl),
        UK6_EVENT_LOG_MODE: "full",
      };
      const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);



      // Đường dẫn request thực tế phải chứa giá trị đã encode "abc%20123".

      assert.equal(

        started.counters["GET /files/download/abc%20123"] || 0,

        1,

        `expected encoded path param call\n${output}`,

      );



      // Payload log của framework có tags; endpoint tag phải giữ nguyên template ổn định.

      const stableTagPlain = '"endpoint":"/files/download/{id}"';

      const stableTagEscaped = '\\"endpoint\\":\\"/files/download/{id}\\"';

      assert.ok(

        output.includes(stableTagPlain) || output.includes(stableTagEscaped),

        `expected stable tags.endpoint template\n${output}`,

      );

    } finally {

      await started.close();

    }

  },

);

