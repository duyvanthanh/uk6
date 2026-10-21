import * as fs from "node:fs";

import * as os from "node:os";

import * as path from "node:path";

import { spawnSync } from "node:child_process";



export function mkTempDir(prefix: string) {

  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));

}



export function writeFile(p: string, content: string) {

  fs.mkdirSync(path.dirname(p), { recursive: true });

  fs.writeFileSync(p, content, "utf8");

}



export async function waitFor(predicate: () => boolean, { timeoutMs, stepMs }: { timeoutMs: number; stepMs: number }) {

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {

    if (predicate()) return;

    await new Promise((r) => setTimeout(r, stepMs));

  }

  throw new Error("Timed out waiting for condition");

}



export async function waitExit(proc: import("node:child_process").ChildProcess, timeoutMs: number) {

  if (proc.exitCode != null) return;

  await Promise.race([

    new Promise<void>((resolve) => proc.once("exit", () => resolve())),

    new Promise<void>((_resolve, reject) => setTimeout(() => reject(new Error("Timed out waiting process exit")), timeoutMs)),

  ]);

}



export function killTreeBestEffort(proc: import("node:child_process").ChildProcess) {

  try {

    if (!proc?.pid) return;

    if (process.platform === "win32") {

      spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { encoding: "utf8", windowsHide: true });

      return;

    }

    proc.kill("SIGKILL");

  } catch {

    // ignore

  }

}



export function rmRfRetry(dirPath: string, opts?: { retries?: number; delayMs?: number }) {

  const retries = Math.max(0, Math.floor(opts?.retries ?? (process.platform === "win32" ? 20 : 3)));

  const delayMs = Math.max(0, Math.floor(opts?.delayMs ?? (process.platform === "win32" ? 50 : 10)));



  for (let attempt = 0; attempt <= retries; attempt++) {

    try {

      fs.rmSync(dirPath, { recursive: true, force: true });

      return;

    } catch (err: any) {

      const code = String(err?.code || "");

      const retryable = code === "EBUSY" || code === "EPERM" || code === "EACCES";

      if (!retryable || attempt >= retries) throw err;

      const start = Date.now();

      while (Date.now() - start < delayMs) {

        // Vòng chờ bận: test ngắn nên cách này tránh phải thêm độ phức tạp async vào phần cleanup.

      }

    }

  }

}

