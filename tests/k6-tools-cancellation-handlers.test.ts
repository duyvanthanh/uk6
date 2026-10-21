import test from "node:test";
import assert from "node:assert/strict";
import { installCancellationHandlers } from "../src/k6-tools/run/process/cancellation";

test("k6-tools: cancellation handler exposes uninstall", () => {
  const killed: Array<string> = [];
  const k6Child: any = { killed: false, pid: 123, kill: (sig: string) => killed.push(`k6:${sig}`) };

  const handlers = installCancellationHandlers({ k6Child, debugMode: false, killDelayMs: 0 });
  try {
    assert.ok(typeof handlers.uninstall === "function");
  } finally {
    handlers.uninstall();
  }
});
