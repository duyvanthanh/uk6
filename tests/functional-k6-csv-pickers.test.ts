/**

 * Test functional k6: driver và picker cho CSV.

 *

 * Xác minh các helper CSV hoạt động đúng trong runtime k6 thật:

 * - `createCsvDriver()` đọc CSV qua `open()` + `SharedArray`

 * - `createCsvPicker()` hỗ trợ các mode `per_vu`, `global`, `fixed_vu`, `split`, `split_by_max_vus`

 * - picker chèn bản ghi đã chọn vào `ctx[ctxKey]`

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import { getFunctionalK6Config, runProcess } from "./_functional-k6-harness";



function extractK6LogMsgs(output: string, marker: string) {

  const lines = output.split(/\r?\n/);

  const hits: string[] = [];



  for (const raw of lines) {

    const line = raw.trim();

    if (!line.includes(marker)) continue;



    // Format console k6 điển hình:

    // `time="..." level=info msg="FT_... <payload>" source=console`. 

    // `msg="..."` có thể chứa dấu nháy đã escape (vd. `{\"a\":1}`), nên cần parse phần escape.

    const m = line.match(/msg="((?:\\.|[^"])*)"/);

    if (m && m[1]) {

      hits.push(m[1]);

      continue;

    }



    // Fallback: giữ nguyên cả dòng nếu không có `msg="..."`.

    hits.push(line);

  }



  return hits;

}



function parsePossiblyEscapedJson(text: string) {

  // Console log của k6 thường escape dấu nháy bên trong `msg="..."`.

  // Ví dụ payload: {\"rowCount\":4,\"headers\":[...]}

  const normalized = text.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r");

  return JSON.parse(normalized);

}



function extractMarkerRows(output: string, marker: string) {

  const msgs = extractK6LogMsgs(output, marker);

  return msgs

    .map((msg) => {

      const parsed = msg.match(new RegExp(`^${marker}\\s+vu=(\\d+)\\s+iter=(\\d+)\\s+id=([^\\s]+)\\s+name=([^\\s]+)\\s+ctx=(\\w+)`));

      if (!parsed) return null;

      return {

        vu: Number(parsed[1]),

        iter: Number(parsed[2]),

        id: parsed[3],

        name: parsed[4],

        ctx: parsed[5],

      };

    })

    .filter(Boolean) as Array<{ vu: number; iter: number; id: string; name: string; ctx: string }>;

}



function toVuIterMap(rows: Array<{ vu: number; iter: number; id: string; name: string; ctx: string }>) {

  return new Map(rows.map((row) => [`${row.vu}:${row.iter}`, row]));

}



test(

  "functional: CSV driver và picker hoạt động đúng ở các mode per_vu/global/fixed_vu/split/split_by_max_vus",

  { skip: getFunctionalK6Config().skipReason },

  async () => {

    const { repoRoot, k6Binary } = getFunctionalK6Config();

    const scriptPath = path.join(repoRoot, "tests", "functional-k6", "csv-pickers.js");

    const env = {

      ...process.env,

      FT_CSV_PATH: path.join(repoRoot, "tests", "functional-k6", "data", "users.csv"),

      NO_PROXY: "127.0.0.1,localhost",

      no_proxy: "127.0.0.1,localhost",

      HTTP_PROXY: "",

      HTTPS_PROXY: "",

      http_proxy: "",

      https_proxy: "",

    };

    const run = await runProcess(k6Binary as string, ["run", scriptPath], { cwd: repoRoot, env, timeoutMs: 20_000 });

    const output = `${run.stdout || ""}\n${run.stderr || ""}`;

    assert.equal(run.status, 0, `k6 exited with code ${run.status}\n${output}`);



    // 1) Độ đúng của parse: script phải emit snapshot của CSV đã parse.

    const parsedMsgs = extractK6LogMsgs(output, "FT_CSV_PARSED");

    assert.ok(parsedMsgs.length >= 1, `expected FT_CSV_PARSED marker\n${output}`);

    const firstMsg = parsedMsgs[0];

    const parsedJsonText = firstMsg.replace(/^FT_CSV_PARSED\s+vu=\d+\s+/, "");

    const parsed = parsePossiblyEscapedJson(parsedJsonText);

    assert.equal(parsed.rowCount, 4, `expected 4 parsed rows\n${parsedJsonText}`);

    assert.deepEqual(parsed.headers, ["id", "name"], `expected headers id,name\n${parsedJsonText}`);

    assert.deepEqual(parsed.rows, [

      { id: "1", name: "Alice" },

      { id: "2", name: "Bob" },

      { id: "3", name: "Charlie" },

      { id: "4", name: "Diana" },

    ]);



    // 2) Hành vi theo mode: vẫn phải có marker theo từng scenario và đã inject vào ctx.

    assert.match(output, /FT_CSV_PER_VU/, `expected per_vu marker\n${output}`);

    assert.match(output, /FT_CSV_GLOBAL/, `expected global marker\n${output}`);

    assert.match(output, /FT_CSV_FIXED_VU/, `expected fixed_vu marker\n${output}`);

    assert.match(output, /FT_CSV_SPLIT/, `expected split marker\n${output}`);

    assert.match(output, /FT_CSV_SPLIT_BY_MAX_CONSTANT/, `expected split_by_max_vus constant-vus marker\n${output}`);

    assert.match(output, /FT_CSV_SPLIT_BY_MAX_RAMPING/, `expected split_by_max_vus ramping-vus marker\n${output}`);

    assert.match(output, /FT_CSV_GLOBAL_RAMPING/, `expected ramping global marker\n${output}`);

    assert.match(output, /ctx=ok/, `expected ctx injection\n${output}`);



    // 3) split_by_max_vus với constant-vus: map theo slot cố định 2 VU.

    const constantRows = extractMarkerRows(output, "FT_CSV_SPLIT_BY_MAX_CONSTANT");

    const constantMap = toVuIterMap(constantRows);

    assert.equal(constantRows.length >= 4, true, `expected >= 4 constant split_by_max logs\n${output}`);

    for (const row of constantRows) {

      assert.equal(row.ctx, "ok", `expected ctx=ok for constant split_by_max row\n${output}`);

    }

    const constantVus = Array.from(new Set(constantRows.map((row) => row.vu)));

    assert.equal(constantVus.length >= 2, true, `expected at least 2 VUs in constant split_by_max scenario\n${output}`);

    for (const vu of constantVus.slice(0, 2)) {

      const first = constantMap.get(`${vu}:0`);

      const second = constantMap.get(`${vu}:1`);

      assert.ok(first, `expected vu=${vu} iter=0 in constant split_by_max\n${output}`);

      assert.ok(second, `expected vu=${vu} iter=1 in constant split_by_max\n${output}`);

      assert.notEqual(first?.id, second?.id, `expected vu=${vu} to progress across rows in constant split_by_max\n${output}`);

    }



    // 4) split_by_max_vus với ramping-vus: VU khởi động muộn vẫn nhận slot riêng.

    const rampingRows = extractMarkerRows(output, "FT_CSV_SPLIT_BY_MAX_RAMPING");

    assert.equal(rampingRows.length >= 3, true, `expected >= 3 ramping split_by_max logs\n${output}`);

    for (const row of rampingRows) {

      assert.equal(row.ctx, "ok", `expected ctx=ok for ramping split_by_max row\n${output}`);

    }

    const firstIterationRows = rampingRows.filter((row) => row.iter === 0);

    const firstIterationVus = Array.from(new Set(firstIterationRows.map((row) => row.vu)));

    assert.equal(firstIterationVus.length >= 2, true, `expected late-starting VUs to emit iter=0 logs\n${output}`);

    const rampingMap = toVuIterMap(rampingRows);

    for (const vu of firstIterationVus) {

      const first = rampingMap.get(`${vu}:0`);

      const second = rampingMap.get(`${vu}:1`);

      if (first && second) {

        assert.notEqual(first.id, second.id, `expected vu=${vu} to progress across rows in ramping split_by_max\n${output}`);

      }

    }



  },

);

