import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough, Writable } from "node:stream";

import { attachLiveOutputProcessing } from "../src/k6-tools/run/live/streamRunner";

function createWriter() {
  let text = "";
  const writer = new Writable({
    write(chunk, _enc, callback) {
      text += typeof chunk === "string" ? chunk : chunk.toString("utf8");
      callback();
    },
  }) as Writable & NodeJS.WriteStream;

  return {
    writer,
    getText() {
      return text;
    },
  };
}

test("k6-tools: stream runner flushes carriage-return progress lines without waiting for newline", async () => {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const out = createWriter();
  const err = createWriter();

  const liveOutput = attachLiveOutputProcessing({
    child: { stdout, stderr },
    runStartEpochMs: Date.now(),
    liveStore: null,
    stdout: out.writer,
    stderr: err.writer,
  });

  stdout.write("running (@m01.0s), 4/5 VUs, 100 complete and 0 interrupted iterations\r");
  stdout.write("encryptData   [   3% ] 4/5 VUs 00.9s/31.0s\r");
  stdout.write("running (@m02.0s), 5/5 VUs, 200 complete and 0 interrupted iterations\r");
  stdout.write("encryptData   [   6% ] 5/5 VUs 01.9s/31.0s\r");

  await new Promise((r) => setImmediate(r));
  const textDuringRun = out.getText();
  assert.match(textDuringRun, /running \(@m01\.0s\).*?\nencryptData\s+\[\s+3% \].*?\n/s);
  assert.match(textDuringRun, /running \(@m02\.0s\).*?\nencryptData\s+\[\s+6% \].*?\n/s);

  stdout.end();
  stderr.end();
  await liveOutput.done;

  assert.equal(err.getText(), "");
});
