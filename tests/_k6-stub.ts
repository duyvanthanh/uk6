import * as fs from "node:fs";
import * as path from "node:path";

/** Launch the same Node fixture through a native executable on either OS. */
export function writeK6Launcher(stubDir: string, scriptPath: string, args: string[] = []) {
  const command = [process.execPath, scriptPath, ...args];
  if (process.platform === "win32") {
    fs.writeFileSync(path.join(stubDir, "k6.cmd"),
      `@echo off\r\n${command.map((arg) => `"${arg}"`).join(" ")} %*\r\n`);
  } else {
    const quote = (arg: string) => `'${arg.replace(/'/g, `'"'"'`)}'`;
    fs.writeFileSync(path.join(stubDir, "k6"),
      `#!/bin/sh\nexec ${command.map(quote).join(" ")} "$@"\n`, { mode: 0o755 });
  }
}

export function writeK6Stub(stubDir: string, code: string) {
  fs.mkdirSync(stubDir, { recursive: true });
  const scriptPath = path.join(stubDir, "k6-stub.cjs");
  fs.writeFileSync(scriptPath, code);
  writeK6Launcher(stubDir, scriptPath);
}

/** k6's console wrapper, with JSON escaping independent of shell syntax. */
export function logEventCode(msg: object, level = "info", second = 0) {
  const time = `2026-01-01T00:00:${String(second).padStart(2, "0")}.000Z`;
  const line = `time="${time}" level=${level} msg=${JSON.stringify(JSON.stringify(msg))} source=console`;
  return `console.log(${JSON.stringify(line)});\n`;
}
