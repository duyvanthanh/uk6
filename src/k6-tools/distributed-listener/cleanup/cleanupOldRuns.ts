import * as fs from "node:fs";
import * as path from "node:path";
import { tryRmDirRecursive } from "../fs/dirs.js";

export function cleanupOldRuns({ dirs, maxAgeMs, debug }: { dirs: any, maxAgeMs: any, debug: any}) {
  const now = Date.now();
  const cutoff = now - maxAgeMs;

  const statMtime = (p: any) => {
    try {
      if (!fs.existsSync(p)) return 0;
      const st = fs.statSync(p);
      return st?.mtimeMs || 0;
    } catch (_) {
      return 0;
    }
  };

  const newestMtimeForRun = (runId: any) => {
    // IMPORTANT: giữ logic nông, recursive quá sâu sẽ chặn listener
    let newest = 0;
    const runDir = path.join(dirs.runsDir, runId);
    const reportDir = path.join(dirs.reportsDir, runId);
    const workspaceDir = path.join(dirs.workspacesDir, runId);

    newest = Math.max(newest, statMtime(runDir), statMtime(reportDir), statMtime(workspaceDir));
    newest = Math.max(newest, statMtime(path.join(runDir, "cancel.json")));

    // runs/<runId>/nodes/*/status.json
    try {
      const nodesDir = path.join(runDir, "nodes");
      if (fs.existsSync(nodesDir)) {
        const nodes = fs.readdirSync(nodesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
        for (const node of nodes) {
          newest = Math.max(newest, statMtime(path.join(nodesDir, node, "status.json")));
        }
      }
    } catch (_) {
      // ignore
    }

    // reports/<runId>/*/meta.json
    try {
      if (fs.existsSync(reportDir)) {
        const nodes = fs.readdirSync(reportDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
        for (const node of nodes) {
          newest = Math.max(newest, statMtime(path.join(reportDir, node, "meta.json")));
        }
      }
    } catch (_) {
      // ignore
    }

    // workspaces/<runId>/base/uk6-distributed-workspace.json
    newest = Math.max(newest, statMtime(path.join(workspaceDir, "base", "uk6-distributed-workspace.json")));
    return newest;
  };

  const maybeCleanupRunId = (runId: any) => {
    const runDir = path.join(dirs.runsDir, runId);
    const reportDir = path.join(dirs.reportsDir, runId);
    const workspaceDir = path.join(dirs.workspacesDir, runId);

    const candidates = [runDir, reportDir, workspaceDir].filter((p) => fs.existsSync(p));
    if (candidates.length === 0) return;

    const newestMtimeMs = newestMtimeForRun(runId);

    if (newestMtimeMs && newestMtimeMs < cutoff) {
      const r1 = tryRmDirRecursive(runDir);
      const r2 = tryRmDirRecursive(reportDir);
      const r3 = tryRmDirRecursive(workspaceDir);
      if (debug && (r1 || r2 || r3)) {
        console.log(`[uk6-distributed] Cleaned old runId=${runId} (runs/reports/workspaces)`);
      }
    }
  };

  // tổng hợp runIds từ 3 root
  const collectIds = (rootDir: any) => {
    try {
      if (!fs.existsSync(rootDir)) return [];
      return fs
        .readdirSync(rootDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch (_) {
      return [];
    }
  };

  const ids = new Set([
    ...collectIds(dirs.runsDir),
    ...collectIds(dirs.reportsDir),
    ...collectIds(dirs.workspacesDir),
  ]);

  for (const runId of ids) {
    maybeCleanupRunId(runId);
  }
}