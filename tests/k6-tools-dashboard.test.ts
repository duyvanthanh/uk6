/** đ  .

 * Test phía Node cho k6-tools: sinh raw dashboard.

 *

 * Xác minh `generateRawDashboard()` ghi ra dashboard HTML và trả về summary dùn g được

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as os from "node:os";

import * as path from "node:path";



test("k6-tools: generateRawDashboard ghi ra file HTML", async () => {

  const { generateRawDashboard } = await import("../src/k6-tools/raw-dashboard.js");



  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "uk6-dashboard-"));

  try {

    const outFile = path.join(tmpDir, "api_dashboard.html");

    const rawEntries = [

      {

        time: new Date().toISOString(),

        level: "info",

        msg: {

          type: "flow_step_call",

          stepName: "step1",

          stepIndex: 0,

          method: "GET",

          url: "http://example/ok",

          tags: { endpoint: "/ok", method: "GET" },

          response: { status: 200, timings: { duration: 12.3 } },

          checks: { "status is 200": true },

        },

      },

      {

        time: new Date().toISOString(),

        level: "error",

        msg: {

          type: "flow_step_error",

          stepName: "step2",

          stepIndex: 1,

          method: "POST",

          url: "http://example/fail",

          tags: { endpoint: "/fail", method: "POST" },

          response: { status: 500, timings: { duration: 45.6 } },

          checks: { "status is 200": false },

        },

      },

    ];



    const summary = generateRawDashboard(rawEntries as any, outFile);

    assert.ok(fs.existsSync(outFile), "expected html output file");

    const html = fs.readFileSync(outFile, "utf8");

    assert.match(html, /Performance Dashboard/i);

    // Bảng overview không show URL 

    assert.doesNotMatch(html, /<table id="api-table">[\s\S]*?<th>URL<\/th><th>Remote<\/th>/i);

    // Bảng Log Explorer có URL. 

    assert.match(html, /<section id="logs"[\s\S]*?<th>URL<\/th>/i);

    assert.match(html, /id="log-refresh"/i);

    assert.match(html, /__uk6_dashboard_state_v2__/i);

    assert.match(html, /Avg \/ Time/i);

    assert.match(html, /id="chart-avg-rt"/i);

    assert.match(html, /function buildAvgRtSeries\(valid,intervalSec\)/);

    assert.match(html, /function formatDetailValue\(v\)/);

    assert.match(html, /JSON\.parse\(trimmed\)/);

    assert.ok(summary && Array.isArray(summary.perApi), "expected summary.perApi");

    assert.equal(summary.totalCalls, 2);

  } finally {

    fs.rmSync(tmpDir, { recursive: true, force: true });

  }

});

