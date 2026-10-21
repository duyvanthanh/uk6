import * as fs from "node:fs";

import * as http from "node:http";

import * as path from "node:path";

import { spawn, spawnSync } from "node:child_process";



export type CounterMap = Record<string, number>;



function inc(counters: CounterMap, key: string) {

  counters[key] = (counters[key] || 0) + 1;

}



function delay(ms: number) {

  return new Promise<void>((resolve) => setTimeout(resolve, ms));

}



function parseBody(body: string) {

  try {

    return body ? JSON.parse(body) : null;

  } catch {

    return null;

  }

}



export function resetCounters(counters: CounterMap) {

  Object.keys(counters).forEach((k) => {

    delete counters[k];

  });

}



export function resolveRepoRoot() {

  return path.resolve(__dirname, "../../..");

}



export function resolveK6Binary(repoRoot: string) {

  const projectK6 = path.join(repoRoot, "k6", "k6.exe");

  if (fs.existsSync(projectK6)) return projectK6;



  if (process.platform === "win32") {

    const where = spawnSync("where", ["k6"], { encoding: "utf8" });

    if (where.status === 0) return "k6";

    return null;

  }



  const which = spawnSync("which", ["k6"], { encoding: "utf8" });

  if (which.status === 0) return "k6";

  return null;

}



export function getFunctionalK6Config() {

  const repoRoot = resolveRepoRoot();

  const k6Binary = resolveK6Binary(repoRoot);

  const skipReason: string | false = k6Binary

    ? false

    : "k6 not found in PATH (or ./k6/k6.exe). Skipping functional k6 tests.";

  return { repoRoot, k6Binary, skipReason };

}



export function runProcess(

  command: string,

  args: string[],

  opts: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number },

): Promise<{ status: number | null; stdout: string; stderr: string }> {

  return new Promise((resolve, reject) => {

    const child = spawn(command, args, { cwd: opts.cwd, env: opts.env, stdio: ["ignore", "pipe", "pipe"] });



    let stdout = "";

    let stderr = "";



    child.stdout.on("data", (chunk) => {

      stdout += chunk.toString("utf8");

    });

    child.stderr.on("data", (chunk) => {

      stderr += chunk.toString("utf8");

    });



    const timeout = setTimeout(() => {

      try {

        child.kill();

      } catch (_) {

        // ignore

      }

      reject(new Error(`Process timeout after ${opts.timeoutMs}ms: ${command} ${args.join(" ")}`));

    }, opts.timeoutMs);



    child.on("error", (err) => {

      clearTimeout(timeout);

      reject(err);

    });



    child.on("close", (code) => {

      clearTimeout(timeout);

      resolve({ status: code, stdout, stderr });

    });

  });

}



export function buildFunctionalK6Env(baseUrl: string) {

  return {

    ...process.env,

    FT_BASE_URL: baseUrl,

    NO_PROXY: "127.0.0.1,localhost",

    no_proxy: "127.0.0.1,localhost",

    HTTP_PROXY: "",

    HTTPS_PROXY: "",

    http_proxy: "",

    https_proxy: "",

  };

}



export async function startFunctionalMockServer() {

  const counters: CounterMap = {};

  const bodies: Record<string, any[]> = {};

  const headers: Record<string, Array<Record<string, string | string[] | undefined>>> = {};

  const events: Array<{ routeKey: string; timeMs: number }> = [];



  const server = http.createServer((req, res) => {

    const url = req.url || "/";

    let body = "";

    req.on("data", (chunk) => {

      body += String(chunk);

    });

    req.on("end", async () => {

      const method = String(req.method || "GET").toUpperCase();

      const routeKey = `${method} ${url}`;

      inc(counters, routeKey);

      events.push({ routeKey, timeMs: Date.now() });

      if (!bodies[routeKey]) bodies[routeKey] = [];

      if (!headers[routeKey]) headers[routeKey] = [];

      bodies[routeKey].push(body);

      headers[routeKey].push({ ...req.headers });



      res.setHeader("Content-Type", "application/json");

      res.statusCode = 200;



      if (url === "/slow5000" || url.startsWith("/slow5000?")) {

        await delay(5000);

        res.end(JSON.stringify({ ok: true, delayMs: 5000 }));

        return;

      }



      if (url.startsWith("/delay-1000")) {

        await delay(1000);

        res.end(JSON.stringify({ ok: true, delayMs: 1000 }));

        return;

      }



      if (url.startsWith("/delay-500")) {

        await delay(500);

        res.end(JSON.stringify({ ok: true, delayMs: 500 }));

        return;

      }



      if (url.startsWith("/delay-050")) {

        await delay(50);

        res.end(JSON.stringify({ ok: true, delayMs: 50 }));

        return;

      }



      if (url.startsWith("/echo")) {

        res.end(JSON.stringify({ ok: true, url, body, parsed: parseBody(body), headers: req.headers }));

        return;

      }



      if (url.startsWith("/setup-auto")) {

        res.end(JSON.stringify({ result: { token: "setup-auto-token" } }));

        return;

      }



      if (url.startsWith("/login-nested")) {

        res.end(JSON.stringify({ result: { session: { sessionId: "ft-nested-session" } } }));

        return;

      }



      if (url.startsWith("/login")) {

        res.end(JSON.stringify({ sessionId: "ft-session" }));

        return;

      }



      if (url.startsWith("/teardown")) {

        res.end(JSON.stringify({ ok: true }));

        return;

      }



      if (url.startsWith("/api-skip")) {

        res.end(JSON.stringify({ ok: true }));

        return;

      }



      if (url.startsWith("/api1") || url.startsWith("/api2")) {

        const parsed = parseBody(body);

        res.end(JSON.stringify({ ok: true, received: parsed }));

        return;

      }



      if (url.startsWith("/merge")) {

        const parsed = parseBody(body);

        res.end(JSON.stringify({ ok: true, received: parsed, url, headers: req.headers, rawBody: body }));

        return;

      }



      if (url.startsWith("/files/download/")) {

        res.end(JSON.stringify({ ok: true, url }));

        return;

      }



      if (url.startsWith("/download")) {

        res.setHeader("Content-Type", "application/octet-stream");

        res.end("BINARYDATA");

        return;

      }



      if (url.startsWith("/data")) {

        res.end(JSON.stringify({ data: { id: "abc123" } }));

        return;

      }



      if (url.startsWith("/skip-me")) {

        res.end(JSON.stringify({ ok: true }));

        return;

      }



      if (url.startsWith("/use-id")) {

        const parsed = parseBody(body);

        if (!parsed || parsed.id !== "abc123") {

          res.statusCode = 400;

          res.end(JSON.stringify({ ok: false }));

          return;

        }

        res.end(JSON.stringify({ ok: true }));

        return;

      }



      if (url.startsWith("/use-session") || url.startsWith("/use-extracted")) {

        const parsed = parseBody(body);

        if (!parsed || parsed.sessionId !== "ft-nested-session") {

          res.statusCode = 400;

          res.end(JSON.stringify({ ok: false }));

          return;

        }

        res.end(JSON.stringify({ ok: true }));

        return;

      }



      if (url.startsWith("/use-shared")) {

        const parsed = parseBody(body);

        if (!parsed || parsed.sharedKey !== "B") {

          res.statusCode = 400;

          res.end(JSON.stringify({ ok: false }));

          return;

        }

        res.end(JSON.stringify({ ok: true }));

        return;

      }



      if (url.startsWith("/concurrent-a") || url.startsWith("/concurrent-b")) {

        const parsed = parseBody(body);

        res.end(JSON.stringify({ value: parsed && parsed.value ? parsed.value : null }));

        return;

      }



      if (url.startsWith("/biz")) {

        const parsed = parseBody(body);

        const responseCode = parsed && typeof parsed.responseCode === "string" ? parsed.responseCode : "00";

        res.end(JSON.stringify({ result: { responseCode } }));

        return;

      }



      if (url.startsWith("/fail")) {

        res.statusCode = 500;

        res.end(JSON.stringify({ ok: false }));

        return;

      }



      res.end(JSON.stringify({ ok: true }));

    });

  });



  const started = await new Promise<{

    server: http.Server;

    baseUrl: string;

    counters: CounterMap;

    bodies: Record<string, any[]>;

    headers: Record<string, Array<Record<string, string | string[] | undefined>>>;

    events: Array<{ routeKey: string; timeMs: number }>;

  }>((resolve) => {

    server.listen(0, "127.0.0.1", () => {

      const addr = server.address();

      const port = typeof addr === "object" && addr ? addr.port : 0;

      resolve({ server, baseUrl: `http://127.0.0.1:${port}`, counters, bodies, headers, events });

    });

  });



  return {

    ...started,

    close: () =>

      new Promise<void>((resolve) => {

        started.server.close(() => resolve());

      }),

  };

}

