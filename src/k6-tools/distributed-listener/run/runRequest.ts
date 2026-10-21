import { spawn, type ChildProcess } from "node:child_process";



import { markStatus } from "../distributed/status.js";

import { isCancelled } from "../distributed/cancel.js";

import { ensureNodeWorkspaceReady, type DistributedRunRequest } from "./workspace.js";



export type RunRequestParams = {

  runnerJs: string;

  request: DistributedRunRequest & { startAtEpochMs?: number | null };

  nodeId: string;

  runsDir: string;

  distributedSharedPath: string;

  internalRoot: string;

  agentId?: string;

  debug?: boolean;

  runningChildren: Map<string, ChildProcess>;

};



export function runRequest(params: RunRequestParams) {

  const { runnerJs, request, nodeId, runsDir, distributedSharedPath, internalRoot, agentId, debug, runningChildren } = params;



  const runId = request.runId;

  const args = Array.isArray(request.argv) ? request.argv : [];

  const nodeWorkspaceDir = ensureNodeWorkspaceReady({ internalRoot, request, runId, nodeId, debug });



  markStatus({

    runsDir,

    runId,

    nodeId,

    patch: {

      runId,

      agentId: agentId || null,

      nodeId,

      state: "running",

      startedAtEpochMs: Date.now(),

      requestStartAtEpochMs: request.startAtEpochMs ?? null,

    },

  });



  if (debug) {

    console.log(`[uk6-distributed] runId=${runId} nodeId=${nodeId} runner=${runnerJs}`);

    console.log(`[uk6-distributed] argv: ${args.join(" ")}`);

  } else {

    console.log(`[uk6-distributed] Starting runId=${runId} (nodeId=${nodeId})`);

  }



  const child = spawn(process.execPath, [runnerJs, ...args], {

    cwd: process.cwd(),

    stdio: "inherit",

    env: {

      ...process.env,

      UK6_SOURCE_ROOT: nodeWorkspaceDir,

      UK6_DISTRIBUTED_SHARED_PATH: distributedSharedPath,

      UK6_DISTRIBUTED_NODE_ID: nodeId,

      UK6_DISTRIBUTED_RUN_ID: runId,

    },

  });



  runningChildren.set(runId, child);



  child.on("exit", (code, signal) => {

    runningChildren.delete(runId);

    markStatus({

      runsDir,

      runId,

      nodeId,

      patch: {

        agentId: agentId || null,

        state: isCancelled({ runsDir, runId }) ? "cancelled" : "done",

        finishedAtEpochMs: Date.now(),

        exitCode: code,

        signal: signal || null,

      },

    });

    console.log(`[uk6-distributed] Finished runId=${runId} (nodeId=${nodeId}) exitCode=${code}`);

  });



  return child;

}

