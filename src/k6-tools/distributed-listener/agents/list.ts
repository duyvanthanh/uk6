import * as fs from "node:fs";

import * as path from "node:path";

import { safeReadJson } from "../fs/json.js";



export function listAgents({ agentsDir, ttlMs }: { agentsDir: any, ttlMs: any}) {

  const now = Date.now();

  if (!fs.existsSync(agentsDir)) return [];

  const files = fs

    .readdirSync(agentsDir)

    .filter((f) => f.toLowerCase().endsWith(".json"))

    .map((f) => path.join(agentsDir, f));



  const agents = [];

  for (const filePath of files) {

    const data = safeReadJson(filePath);

    if (!data) continue;

    const nodeId = data.agentId || data.nodeId || path.basename(filePath, ".json");

    const lastSeenEpochMs = Number(data.lastSeenEpochMs || 0);

    const online = lastSeenEpochMs > 0 && now - lastSeenEpochMs <= ttlMs;

    agents.push({

      nodeId,

      online,

      lastSeenEpochMs: lastSeenEpochMs || null,

      state: data.state || null,

      runningRunIds: Array.isArray(data.runningRunIds) ? data.runningRunIds : [],

      pid: typeof data.pid === "number" ? data.pid : null,

      hostname: data.hostname || null,

      cwd: data.cwd || null,

      lastNodeId: data.nodeId || null,

    });

  }



  agents.sort((a, b) => (b.lastSeenEpochMs || 0) - (a.lastSeenEpochMs || 0));

  return agents;

}



export function printAgentList({ agentsDir, ttlMs }: { agentsDir: any, ttlMs: any}) {

  const agents = listAgents({ agentsDir, ttlMs });

  const now = Date.now();

  const onlineCount = agents.filter((a) => a.online).length;

  console.log(`uk6 distributed agents (ttlMs=${ttlMs})`);

  console.log(`total=${agents.length} online=${onlineCount} offline=${agents.length - onlineCount}`);

  console.log("");

  for (const a of agents) {

    const ageMs = a.lastSeenEpochMs ? Math.max(0, now - a.lastSeenEpochMs) : null;

    const age = ageMs == null ? "unknown" : `${ageMs}ms`;

    const status = a.online ? "ONLINE" : "OFFLINE";

    const running = a.runningRunIds && a.runningRunIds.length ? ` running=${a.runningRunIds.join(",")}` : "";

    const state = a.state ? ` state=${a.state}` : "";

    const lastNode = a.lastNodeId ? ` nodeId=${a.lastNodeId}` : "";

    console.log(`${status} agentId=${a.nodeId}${lastNode}${state} lastSeen=${age}${running}`);

  }

}

