/**

 * Test phía Node cho k6-tools: `buildForK6` bundle và rewrite alias import.

 *

 * Xác minh `buildForK6()`:

 * - copy `src/` and `tests/` vào `.k6-build/`

 * - rewrites `import ... từ "src/..."` thành import tương đối của bản build

 */

import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as os from "node:os";

import * as path from "node:path";



function withTempDir(run: (dir: string) => Promise<void> | void) {

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "uk6-build-"));

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



test("k6-tools: buildForK6 bundle và rewrite alias import đúng", async () => {

  const repoRoot = path.resolve(__dirname, "../../..");

  const { buildForK6 } = await import("../src/k6-tools/build-k6.js");



  await withTempDir(async (tmp) => {

    fs.mkdirSync(path.join(tmp, "src", "utils"), { recursive: true });

    fs.mkdirSync(path.join(tmp, "tests"), { recursive: true });



    fs.writeFileSync(path.join(tmp, "src", "utils", "index.js"), "export function hello(){ return 'hi'; }\n", "utf8");

    fs.writeFileSync(

      path.join(tmp, "tests", "entry.js"),

      "import { hello } from 'src/utils';\nexport default function(){ console.log(hello()); }\n",

      "utf8",

    );



    const prev = process.cwd();

    process.chdir(tmp);

    try {

      const outFile = await buildForK6("tests/entry.js");

      assert.ok(fs.existsSync(outFile), "expected bundle output file");



      const buildRoot = path.join(tmp, ".k6-build");

      assert.ok(fs.existsSync(path.join(buildRoot, "src", "utils", "index.js")), "expected copied src");

      assert.ok(fs.existsSync(path.join(buildRoot, "tests", "entry.js")), "expected copied tests");



      const copiedEntry = fs.readFileSync(path.join(buildRoot, "tests", "entry.js"), "utf8");

      assert.match(copiedEntry, /import \{ hello \} from '\.\.\/src\/utils\/index\.js'/);

    } finally {

      process.chdir(prev);

    }

  });



  assert.ok(repoRoot.length > 0);

});

