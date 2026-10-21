/**

 * Test phía Node cho k6-tools: `uk6 --inspect` sinh HTML biểu diễn VU plan.

 *

 * Xác minh `uk6 --inspect <script>` chạy `k6 inspect` và sinh ra artifact HTML cùng JSON.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as path from "node:path";

import * as fs from "node:fs";

import { spawnSync } from "node:child_process";



test("k6-tools: uk6 --inspect sinh vu-plan HTML ở cả hai thứ tự tham số", () => {

  const repoRoot = path.resolve(__dirname, "../../..");

  const runJs = path.join(repoRoot, "dist", "cjs", "src", "k6-tools", "run.js");

  const scriptPath = path.join(repoRoot, "tests", "functional-k6", "inspect-self-import.js");



  const outDir1 = path.join(

    repoRoot,

    "dist",

    "tmp-test",

    `inspect-${Date.now()}-${Math.random().toString(16).slice(2)}-1`,

  );

  const outDir2 = path.join(

    repoRoot,

    "dist",

    "tmp-test",

    `inspect-${Date.now()}-${Math.random().toString(16).slice(2)}-2`,

  );

  fs.mkdirSync(outDir1, { recursive: true });

  fs.mkdirSync(outDir2, { recursive: true });



  try {

    for (const outDir of [outDir1, outDir2]) {

      const args =

        outDir === outDir1

          ? [runJs, "--inspect", scriptPath, `--out=${outDir}`]

          : [runJs, scriptPath, "--inspect", `--out=${outDir}`];



      const result = spawnSync(process.execPath, args, {

        encoding: "utf8",

        cwd: repoRoot,

      });

      const output = `${result.stdout || ""}\n${result.stderr || ""}`;

      assert.equal(result.status, 0, output);



      const htmlPath = path.join(outDir, "k6.inspect.vu-plan.html");

      const planPath = path.join(outDir, "k6.vu-plan.json");

      const inspectPath = path.join(outDir, "k6.inspect.json");



      assert.ok(fs.existsSync(htmlPath), `Missing ${htmlPath}`);

      assert.ok(fs.existsSync(planPath), `Missing ${planPath}`);

      assert.ok(fs.existsSync(inspectPath), `Missing ${inspectPath}`);



      const html = fs.readFileSync(htmlPath, "utf8");

      assert.match(html, /k6 Inspect - VU Plan/);

      assert.match(html, /<canvas id="vuCanvas"/);



      const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));

      assert.ok(plan && plan.total && Array.isArray(plan.total.points), "Invalid plan JSON");



      // Giữ đường VU phẳng tới cuối rồi mới rơi xuống, không được nghiêng dần.

      // Trước đây hệ thống phát các điểm kiểu `[{t:0,v:2},{t:end,v:0}]`,

      // khiến biểu đồ hiển thị thành một đường dốc.

      const scenario = Array.isArray(plan.scenarios) ? plan.scenarios.find((s: any) => s && s.name === "main") : null;

      assert.ok(scenario && Array.isArray(scenario.points), "Missing scenario points");

      const pts = scenario.points as Array<{ tMs: number; vus: number }>;

      assert.ok(pts.length >= 3, `Expected >=3 points, got ${pts.length}`);

      assert.equal(pts[0].vus, 2);

      assert.equal(pts[pts.length - 1].vus, 0);

      assert.ok(pts[pts.length - 1].tMs > pts[pts.length - 2].tMs, "Drop-to-zero point must be after steady-state end");

    }

  } finally {

    try {

      fs.rmSync(outDir1, { recursive: true, force: true });

      fs.rmSync(outDir2, { recursive: true, force: true });

    } catch (_) {

      // 

    }

  }

});

