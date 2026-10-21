/**

 * Test functional k6: metric attachment ở mức step (rate/count) hoạt động cho cả flow và concurrent.

 *

 * Xác minh:

 * - `addToMetricRate()` ghi nhận lỗi khi BẤT KỲ check nào fail (mặc định `failIf="any"`)

 * - `addToMetricCount()` chỉ tăng khi response bị xem là sai

 * - `failIf="all"` chỉ ghi lỗi khi toàn bộ check đều fail

 * - wiring hoạt động đúng cho các step trong concurrent group (`http.batch`)

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as os from "node:os";

import * as path from "node:path";

import {

  buildFunctionalK6Env,

  getFunctionalK6Config,

  resetCounters,

  runProcess,

  startFunctionalMockServer,

} from "./_functional-k6-harness";



function readJson(p: string) {

  const raw = fs.readFileSync(p, "utf8");

  return JSON.parse(raw);

}



function getMetric(summary: any, name: string) {

  const m = summary?.metrics?.[name];

  assert.ok(m, `missing metric "${name}" in summary-export`);

  return m;

}



test(

  "functional: metric attachment ghi nhận đúng giá trị kỳ vọng",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const started = await startFunctionalMockServer();

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "uk6-metrics-"));

    const summaryPath = path.join(tmpDir, "summary.json");



    try {

      resetCounters(started.counters);

      const scriptPath = path.join(repoRoot, "tests", "functional-k6", "metric-attachments.js");

      const env = buildFunctionalK6Env(started.baseUrl);



      const run = await runProcess(

        k6Binary as string,

        ["run", "--summary-export", summaryPath, scriptPath],

        { cwd: repoRoot, env, timeoutMs: 30_000 },

      );

      const output = `${run.stdout || ""}\n${run.stderr || ""}`;

      assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);

      assert.ok(fs.existsSync(summaryPath), `missing summary export at ${summaryPath}\n${output}`);



      const summary = readJson(summaryPath);



      // Flow tuần tự: 10 iteration; 3 response code sai -> rate 0.3, count 3. 

      const wrongRespRate = getMetric(summary, "wrong_response_code_rate");

      assert.ok(

        typeof wrongRespRate.value === "number",

        `expected wrong_response_code_rate.value to be a number; got ${JSON.stringify(wrongRespRate)}`,

      );

      assert.ok(

        Math.abs(Number(wrongRespRate.value) - 0.3) < 1e-9,

        `expected wrong_response_code_rate.value=0.3; got ${wrongRespRate.value}`,

      );



      const wrongRespCount = getMetric(summary, "wrong_response_code_count");

      assert.ok(

        typeof wrongRespCount.count === "number",

        `expected wrong_response_code_count.count to be a number; got ${JSON.stringify(wrongRespCount)}`,

      );

      assert.equal(

        Number(wrongRespCount.count),

        3,

        `expected wrong_response_code_count.count=3; got ${wrongRespCount.count}`,

      );



      // `failIf="all"`: chỉ `assertPath` fail ở các mã sai, nên trạng thái "mọi check đều fail" sẽ không xảy ra -> rate 0.

      const allFailRate = getMetric(summary, "wrong_response_code_allfail_rate");

      assert.ok(

        typeof allFailRate.value === "number",

        `expected wrong_response_code_allfail_rate.value to be a number; got ${JSON.stringify(allFailRate)}`,

      );

      assert.equal(

        Number(allFailRate.value),

        0,

        `expected wrong_response_code_allfail_rate.value=0; got ${allFailRate.value}`,

      );



      // Concurrent group: biz-A có 2 lỗi; biz-B có 1 lỗi -> tổng count là 3.

      const concurrentCount = getMetric(summary, "wrong_concurrent_response_code_count");

      assert.ok(

        typeof concurrentCount.count === "number",

        `expected wrong_concurrent_response_code_count.count to be a number; got ${JSON.stringify(concurrentCount)}`,

      );

      assert.equal(

        Number(concurrentCount.count),

        3,

        `expected wrong_concurrent_response_code_count.count=3; got ${concurrentCount.count}`,

      );



      // Sanity check: mock server thấy 10 POST /biz cho flow step + (10 * 2) cho concurrent group = 30. 

      assert.equal(started.counters["POST /biz"] || 0, 30, `expected 30 calls to POST /biz\n${output}`);

    } finally {

      await started.close();

      try {

        // Giữ artifact nếu được yêu cầu tường minh để phục vụ debug.

        if (!process.env.FT_KEEP_TMP) fs.rmSync(tmpDir, { recursive: true, force: true });

      } catch {

        // ignore cleanup failure

      }

    }

  },

);

