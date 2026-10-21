/**

 * Node-side test for k6-tools: `buildForK6` should tree-shake unused `uk6/k6-framework` exports

 * and avoid bundling inline sourcemaps when disabled.

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as os from "node:os";

import * as path from "node:path";



function withTempDir(run: (dir: string) => Promise<void> | void) {

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "uk6-treeshake-"));

  try {

    return Promise.resolve(run(dir));

  } finally {

    try {

      fs.rmSync(dir, { recursive: true, force: true });

    } catch {

      // ignore cleanup errors

    }

  }

}



test("k6-tools: buildForK6 treeshake loại bỏ các module không cần thiết", async () => {

  const { buildForK6 } = await import("../src/k6-tools/build-k6.js");



  await withTempDir(async (tmp) => {

    fs.mkdirSync(path.join(tmp, "tests"), { recursive: true });



    fs.writeFileSync(

      path.join(tmp, "tests", "entry.js"),

      [

        'import { assertStatus, assertPath, flow, createScenario, setups, extractValues } from "uk6/k6-framework";',

        "",

        "export const options = {};",

        "",

        "const setupTasks = [{ name: 'noop', endpoint: () => ({ method: 'GET', url: '/', isSql: false }), extractors: { x: 'y' } }];",

        "const flowSteps = [{ name: 'noop', endpoint: () => ({ method: 'GET', url: '/', isSql: false }), checks: [assertStatus(200), assertPath('a','b')], extractors: extractValues({}) }];",

        "const { setup, runScenario } = createScenario({ flowName: 't', plan: [setups(setupTasks), flow(flowSteps)] });",

        "export { setup, runScenario };",

        "",

      ].join("\n"),

      "utf8",

    );



    const prev = process.cwd();

    process.chdir(tmp);

    try {

      const outFile = await buildForK6("tests/entry.js", { treeshake: true, sourcemap: "off" });

      assert.ok(fs.existsSync(outFile), "expected bundle output file");



      const bundled = fs.readFileSync(outFile, "utf8");

      assert.doesNotMatch(bundled, /createOracleDsn|createSqlQuery/);

      assert.doesNotMatch(bundled, /loadCsv|createCsvDriver|createCsvPicker/);

      assert.doesNotMatch(bundled, /executeSql\(|normalizeSqlInput/);

      assert.doesNotMatch(bundled, /sourceMappingURL=data:application\/json/);



      const size = fs.statSync(outFile).size;

      assert.ok(size < 150_000, `expected bundle size < 150KB, got ${size} bytes`);

    } finally {

      process.chdir(prev);

    }

  });

});

