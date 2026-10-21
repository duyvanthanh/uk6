import * as path from "node:path";

import * as fs from "node:fs";



import { safeReadJson, writeJsonAtomic } from "../fs/json.js";

import { copyDirRecursive, copyFileIfExists } from "../fs/files.js";



export type DistributedRunRequest = {

  runId: string;

  argv?: unknown;

  workspace?: {

    baseDir?: string;

  };

};



export function ensureNodeWorkspaceReady(params: {

  internalRoot: string;

  request: DistributedRunRequest;

  runId: string;

  nodeId: string;

  debug?: boolean;

}) {

  const { internalRoot, request, runId, nodeId, debug } = params;

  const baseDirFromRequest = request?.workspace?.baseDir || path.join("workspaces", runId, "base");

  const baseWorkspaceDir = path.resolve(internalRoot, baseDirFromRequest);

  const nodeWorkspaceDir = path.join(internalRoot, "workspaces", runId, "nodes", nodeId);

  const readyFile = path.join(nodeWorkspaceDir, ".uk6-workspace-ready.json");



  const ready = safeReadJson(readyFile);

  if (ready && ready.runId === runId && ready.nodeId === nodeId) {

    return nodeWorkspaceDir;

  }



  if (debug) {

    console.log(`[uk6-distributed] Preparing node workspace: ${nodeWorkspaceDir}`);

    console.log(`[uk6-distributed] Base workspace: ${baseWorkspaceDir}`);

  }



  copyDirRecursive(path.join(baseWorkspaceDir, "src"), path.join(nodeWorkspaceDir, "src"));

  copyDirRecursive(path.join(baseWorkspaceDir, "tests"), path.join(nodeWorkspaceDir, "tests"));

  copyDirRecursive(path.join(baseWorkspaceDir, "k6-report"), path.join(nodeWorkspaceDir, "k6-report"));



  // Copy `.env*` nếu tồn tại (không bắt buộc). Một số project dùng `.env.<env>`.

  try {

    if (fs.existsSync(baseWorkspaceDir)) {

      const envCandidates = fs

        .readdirSync(baseWorkspaceDir, { withFileTypes: true })

        .filter((e) => e.isFile() && e.name.toLowerCase().startsWith(".env"))

        .map((e) => e.name);

      for (const name of envCandidates) {

        copyFileIfExists(path.join(baseWorkspaceDir, name), path.join(nodeWorkspaceDir, name));

      }

    }

  } catch (_) {

    // ignore

  }



  writeJsonAtomic(readyFile, {

    schemaVersion: 1,

    tool: "uk6",

    runId,

    nodeId,

    preparedAtEpochMs: Date.now(),

    baseDir: baseDirFromRequest,

  });



  return nodeWorkspaceDir;

}

