import test from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";

function withLoggingEnv<T>(envValue: Record<string, string | undefined>, fn: (mod: any) => T): T {
  const modPath = path.resolve(__dirname, "../src/k6-framework/base/logging.js");
  const g = globalThis as any;
  const prevEnv = g.__ENV;
  g.__ENV = envValue;
  delete require.cache[modPath];
  try {
    const mod = require(modPath);
    return fn(mod);
  } finally {
    g.__ENV = prevEnv;
  }
}

test("k6-framework logging: missing env defaults to off", () => {
  withLoggingEnv({}, (mod) => {
    assert.equal(mod.getStepLoggingMode(), "off");
  });
});

test("k6-framework logging: compact env maps to compact_success_full_error", () => {
  withLoggingEnv({ UK6_EVENT_LOG_MODE: "compact" }, (mod) => {
    assert.equal(mod.getStepLoggingMode(), "compact_success_full_error");
  });
});

test("k6-framework logging: legacy errors_only maps to compact_success_full_error", () => {
  withLoggingEnv({ UK6_STEP_LOGGING: "errors_only" }, (mod) => {
    assert.equal(mod.getStepLoggingMode(), "compact_success_full_error");
  });
});

test("k6-framework logging: compact mode emits success call compact and error full", () => {
  withLoggingEnv({ UK6_EVENT_LOG_MODE: "compact" }, (mod) => {
    assert.equal(mod.shouldEmitCompactCallEvent({ mode: mod.getStepLoggingMode(), success: true, failedCheck: false }), true);
    assert.equal(mod.shouldEmitFullErrorEvent({ mode: mod.getStepLoggingMode(), success: false, failedCheck: false }), true);
    assert.equal(mod.shouldEmitFullErrorEvent({ mode: mod.getStepLoggingMode(), success: true, failedCheck: true }), true);
  });
});
