import test from "node:test";

import assert from "node:assert/strict";

import * as fs from "node:fs";

import * as os from "node:os";

import * as path from "node:path";



import { writeJsonArrayFileStream, writeJsonArrayJsFileStream } from "../src/k6-tools/run/utils/fs";



function mkTempDir(prefix: string) {

  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));

}



async function rmRfWithRetry(dir: string, retries = 20, delayMs = 100) {

  for (let i = 0; i <= retries; i += 1) {

    try {

      fs.rmSync(dir, { recursive: true, force: true });

      return;

    } catch (e: any) {

      const code = e?.code;

      const retryable = code === "EBUSY" || code === "EPERM" || code === "ENOTEMPTY";

      if (!retryable || i === retries) throw e;

      await new Promise((r) => setTimeout(r, delayMs));

    }

  }

}



test("k6-tools fs writer retries transient EBUSY for JSON and JS dashboard files", async () => {

  const dir = mkTempDir("uk6-fs-retry-");

  const fsMutable = require("node:fs") as typeof fs;

  const originalOpenSync = fsMutable.openSync;

  let openAttempts = 0;



  try {

    fsMutable.openSync = function patchedOpenSync(

      filePath: fs.PathLike,

      flags: fs.OpenMode,

      mode?: fs.Mode | null,

    ) {

      const asString = String(filePath);

      if (

        flags === "w" &&

        asString.includes(`error_log.raw`) &&

        asString.endsWith(`.${process.pid}.tmp`) &&

        openAttempts < 2

      ) {

        openAttempts += 1;

        const err: NodeJS.ErrnoException = new Error("busy");

        err.code = "EBUSY";

        throw err;

      }

      return originalOpenSync.call(fsMutable, filePath, flags, mode);

    };



    const jsonPath = path.join(dir, "dashboard-report", "error_log.raw.json");

    const jsPath = path.join(dir, "dashboard-report", "error_log.raw.js");

    const entries = [{ id: 1 }, { id: 2 }];



    writeJsonArrayFileStream(jsonPath, entries);

    writeJsonArrayJsFileStream(jsPath, "__RAW_LOG_DATA__", entries);



    assert.equal(openAttempts, 2);

    assert.deepEqual(JSON.parse(fs.readFileSync(jsonPath, "utf8")), entries);

    assert.match(fs.readFileSync(jsPath, "utf8"), /window\.__RAW_LOG_DATA__ = \[/);

    assert.ok(!fs.existsSync(`${jsonPath}.${process.pid}.tmp`));

    assert.ok(!fs.existsSync(`${jsPath}.${process.pid}.tmp`));

  } finally {

    fsMutable.openSync = originalOpenSync;

    await rmRfWithRetry(dir);

  }

});

