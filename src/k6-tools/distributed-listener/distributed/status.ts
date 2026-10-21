import * as path from "node:path";



import { safeReadJson, writeJsonAtomic } from "../fs/json.js";



export type RunState =

  | "scheduled"

  | "running"

  | "done"

  | "cancelled"

  | "cancelling"

  | "no_variant_available";



export type RunStatus = {

  schemaVersion?: number;

  tool?: string;

  runId?: string;

  nodeId?: string;

  agentId?: string | null;

  state?: RunState;



  // Timestamps/fields dùng bởi listener.

  startedAtEpochMs?: number | null;

  finishedAtEpochMs?: number | null;

  cancelledAtEpochMs?: number | null;

  cancelRequestedAtEpochMs?: number | null;



  requestStartAtEpochMs?: number | null;

  exitCode?: number | null;

  signal?: string | null;

};



export function statusFileFor(params: { runsDir: string; runId: string; nodeId: string }) {

  const { runsDir, runId, nodeId } = params;

  return path.join(runsDir, runId, "nodes", nodeId, "status.json");

}



export function markStatus(params: { runsDir: string; runId: string; nodeId: string; patch: Partial<RunStatus> }) {

  const { runsDir, runId, nodeId, patch } = params;

  const filePath = statusFileFor({ runsDir, runId, nodeId });

  const previous = (safeReadJson(filePath) || {}) as RunStatus;

  writeJsonAtomic(filePath, { ...previous, ...patch });

}



export function shouldSkipRun(params: { runsDir: string; runId: string; nodeId: string }) {

  const { runsDir, runId, nodeId } = params;

  const filePath = statusFileFor({ runsDir, runId, nodeId });

  const status = safeReadJson(filePath) as RunStatus | null;

  if (!status) return false;



  return (

    status.state === "done" ||

    status.state === "running" ||

    status.state === "scheduled" ||

    status.state === "cancelled" ||

    status.state === "cancelling" ||

    status.state === "no_variant_available"

  );

}



