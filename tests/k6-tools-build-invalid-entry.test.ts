/**

 * Test phía Node cho k6-tools: `buildForK6` từ chối entry nằm ngoài các thư mục cho phép.

 *

 * Xác minh `buildForK6()` sẽ throw khi file entry không nằm trong `{src, tests, k6-report}`.

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



test("k6-tools: buildForK6 báo lỗi khi entry nằm ngoài src/tests/k6-report", async () => {

  const { buildForK6 } = await import("../src/k6-tools/build-k6.js");



  await withTempDir(async (tmp) => {

    fs.writeFileSync(path.join(tmp, "entry.js"), "export default function(){}\n", "utf8");



    const prev = process.cwd();

    process.chdir(tmp);

    try {

      await assert.rejects(() => buildForK6("entry.js"), /Make sure the entry is inside one of/);

    } finally {

      process.chdir(prev);

    }

  });

});

