import * as os from "node:os";

import * as path from "node:path";



export function parseArgs(argv: string[]) {

  const args = argv.slice(2);

  const opts = {

    distributedPath: null as string | null,

    pollMs: 1000,

    nodeId: null as string | null,

    agentId: null as string | null,

    runnerJs: null as string | null,

    once: false,

    debug: false,

    list: false,

    agentTtlMs: 15000,

    startupCleanup: true,

    help: false,

  };



  for (const arg of args) {

    if (arg === "--help" || arg === "-h") {

      opts.help = true;

      continue;

    }

    if (arg.startsWith("--distributed=")) {

      opts.distributedPath = arg.slice("--distributed=".length).trim() || null;

      continue;

    }

    if (arg.startsWith("--poll-ms=")) {

      const v = Number(arg.slice("--poll-ms=".length));

      if (Number.isFinite(v) && v >= 250) {

        opts.pollMs = v;

      }

      continue;

    }

    if (arg.startsWith("--node-id=")) {

      opts.nodeId = arg.slice("--node-id=".length).trim() || null;

      continue;

    }

    if (arg.startsWith("--agent-id=")) {

      opts.agentId = arg.slice("--agent-id=".length).trim() || null;

      continue;

    }

    if (arg.startsWith("--runner-js=")) {

      opts.runnerJs = arg.slice("--runner-js=".length).trim() || null;

      continue;

    }

    if (arg === "--once") {

      opts.once = true;

      continue;

    }

    if (arg === "--list") {

      opts.list = true;

      continue;

    }

    if (arg.startsWith("--agent-ttl-ms=")) {

      const v = Number(arg.slice("--agent-ttl-ms=".length));

      if (Number.isFinite(v) && v >= 1000) {

        opts.agentTtlMs = v;

      }

      continue;

    }

    if (arg === "--startup-cleanup=false") {

      opts.startupCleanup = false;

      continue;

    }

    if (arg === "--startup-cleanup=true") {

      opts.startupCleanup = true;

      continue;

    }

    if (arg === "--debug" || arg === "--debug=true") {

      opts.debug = true;

      continue;

    }

    if (arg === "--debug=false") {

      opts.debug = false;

      continue;

    }

  }



  if (!opts.nodeId) {

    // nodeId cho status/report folders từng run; mặc định unique cho mỗi listener process

    opts.nodeId = `${os.hostname()}-${process.pid}`;

  }



  if (!opts.agentId) {

    // agentId cho heartbeat identity; chỉ unique trên từng máy

    opts.agentId = (process.env.UK6_AGENT_ID || "").trim() || os.hostname();

  }



  if (!opts.runnerJs) {

    // Mặc định built runner nằm cạnh `distributed-listener.js` trong dist output,

    // vẫn cho overide `--runner-js`.

    opts.runnerJs = path.resolve(__dirname, "..", "..", "run.js");

  }



  return opts;

}

