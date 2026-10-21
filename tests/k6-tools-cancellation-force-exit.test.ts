import test from "node:test";
import assert from "node:assert/strict";
import { installCancellationHandlers } from "../src/k6-tools/run/process/cancellation";

test("k6-tools: SIGINT triggers forced exit and runs before-exit hook", () => {
  const originalExit = process.exit;
  try {
    let exited: number | null = null;
    let beforeExitCalls = 0;
    (process as any).exit = ((code?: number) => {
      exited = code ?? 0;
      throw new Error("EXIT");
    }) as any;

    const handlers = installCancellationHandlers({
      k6Child: { killed: false, pid: 123, kill: () => {} },
      debugMode: false,
      killDelayMs: 0,
      onBeforeExit: () => {
        beforeExitCalls += 1;
      },
    });

    assert.throws(() => process.emit("SIGINT"), /EXIT/);
    assert.equal(exited, 130);
    assert.equal(beforeExitCalls, 1);
    handlers.uninstall();
  } finally {
    (process as any).exit = originalExit;
  }
});
