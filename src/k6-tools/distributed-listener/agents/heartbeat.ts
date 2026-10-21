import * as path from "node:path";

import { safeReadJson, writeJsonAtomic } from "../fs/json.js";



export function agentHeartbeatFileFor({ agentsDir, nodeId }: { agentsDir: any, nodeId: any }) {

  return path.join(agentsDir, `${nodeId}.json`);

}



export function writeAgentHeartbeat({ agentsDir, agentId, patch }: { agentsDir: any, agentId: any, patch: any }) {

  const filePath = agentHeartbeatFileFor({ agentsDir, nodeId: agentId });

  const previous = safeReadJson(filePath) || {};

  writeJsonAtomic(filePath, { ...previous, ...patch });

}