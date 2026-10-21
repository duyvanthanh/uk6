/**

 * Feature pruning tests for uk6 bundler:

 * - auto: includes SQL impl only when detected

 * - http: forces SQL to be stubbed

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as os from "node:os";

import * as path from "node:path";



function withTempDir(run: (dir: string) => Promise<void> | void) {

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "uk6-features-"));

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



test("k6-tools: bundle tự bỏ SQL khi không sử dụng", async () => {

  const { buildForK6 } = await import("../src/k6-tools/build-k6.js");



  await withTempDir(async (tmp) => {

    fs.mkdirSync(path.join(tmp, "tests"), { recursive: true });

    fs.writeFileSync(

      path.join(tmp, "tests", "entry.js"),

      [

        'import { createScenario, setups, flow } from "uk6/k6-framework";',

        "export const options = {};",

        "const { setup, runScenario } = createScenario({ flowName: 't', plan: [setups([]), flow([])] });",

        "export { setup, runScenario };",

        "",

      ].join("\n"),

      "utf8",

    );



    const prev = process.cwd();

    process.chdir(tmp);

    try {

      const outFile = await buildForK6("tests/entry.js", { treeshake: true, sourcemap: "off", features: "auto" });

      const bundled = fs.readFileSync(outFile, "utf8");

      assert.doesNotMatch(bundled, /executeSql\(|normalizeSqlInput|createOracleDsn/);

      assert.doesNotMatch(bundled, /class StringUtils|class DataUtils/);

    } finally {

      process.chdir(prev);

    }

  });

});



test("k6-tools: http forces SQL stub khi phát hiện SQL", async () => {

  const { buildForK6 } = await import("../src/k6-tools/build-k6.js");



  await withTempDir(async (tmp) => {

    fs.mkdirSync(path.join(tmp, "tests"), { recursive: true });

    fs.writeFileSync(

      path.join(tmp, "tests", "entry.js"),

      [

        'import { createScenario, setups, flow } from "uk6/k6-framework";',

        "export const options = {};",

        "const sqlEndpoint = {",

        "  protocol: 'sql',",

        "  method: 'SQL',",

        "  getUrl() { return 'sql://'; },",

        "  getRequestConfig() { return { sql: { query: 'SELECT 1', params: [] } }; },",

        "};",

        "const { setup, runScenario } = createScenario({ flowName: 't', plan: [setups([{ name: 'db', endpoint: sqlEndpoint }]), flow([])] });",

        "export { setup, runScenario };",

        "",

      ].join("\n"),

      "utf8",

    );



    const prev = process.cwd();

    process.chdir(tmp);

    try {

      const outFile = await buildForK6("tests/entry.js", { treeshake: true, sourcemap: "off", features: "http" });

      const bundled = fs.readFileSync(outFile, "utf8");

      assert.match(bundled, /SQL feature not bundled/);

      assert.doesNotMatch(bundled, /executeSql\(|normalizeSqlInput/);

    } finally {

      process.chdir(prev);

    }

  });

});



test("k6-tools:  giữ SQL khi tìm thấy", async () => {

  const { buildForK6 } = await import("../src/k6-tools/build-k6.js");



  await withTempDir(async (tmp) => {

    fs.mkdirSync(path.join(tmp, "tests"), { recursive: true });

    fs.writeFileSync(

      path.join(tmp, "tests", "entry.js"),

      [

        'import { createScenario, setups, flow } from "uk6/k6-framework";',

        "export const options = {};",

        "const sqlEndpoint = {",

        "  protocol: 'sql',",

        "  method: 'SQL',",

        "  getUrl() { return 'sql://'; },",

        "  getRequestConfig() { return { sql: { query: 'SELECT 1', params: [] } }; },",

        "};",

        "const { setup, runScenario } = createScenario({ flowName: 't', plan: [setups([{ name: 'db', endpoint: sqlEndpoint }]), flow([])] });",

        "export { setup, runScenario };",

        "",

      ].join("\n"),

      "utf8",

    );



    const prev = process.cwd();

    process.chdir(tmp);

    try {

      const outFile = await buildForK6("tests/entry.js", { treeshake: true, sourcemap: "off", features: "auto" });

      const bundled = fs.readFileSync(outFile, "utf8");

      assert.match(bundled, /executeSql\(|normalizeSqlInput/);

      assert.doesNotMatch(bundled, /SQL feature not bundled/);

    } finally {

      process.chdir(prev);

    }

  });

});

