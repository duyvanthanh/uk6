// @ts-nocheck

/**

 * Listener distributed cơ bản cho uk6 thông qua shared folder.

 *

 * Nó poll `<shared>/.uk6-distributed/requests/*.json` và với mỗi request:

 * - lên lịch chạy tại `startAtEpochMs` (hoặc chạy ngay nếu thời điểm đã qua)

 * - chạy uk6 runner tương tự ở local (không kèm bất kỳ cờ `--distributed` nào)

 * - ghi status theo từng node và (tuỳ chọn) copy artifact của dashboard

 *

 * Cố ý KHÔNG điều phối shared state; mỗi listener sẽ chạy mọi request.

 */

import * as fs from "node:fs";

import * as os from "node:os";

import * as path from "node:path";

import { parseArgs } from "./distributed-listener/cli/parseArgs.js";

import { printHelp } from "./distributed-listener/cli/helpText.js";

import { safeReadJson, writeJsonAtomic } from "./distributed-listener/fs/json.js";

import { ensureDir, tryRmDirRecursive } from "./distributed-listener/fs/dirs.js";

import { listRequestFiles, tryDeleteFile } from "./distributed-listener/fs/files.js";

import { buildDistributedDirs } from "./distributed-listener/distributed/dirs.js";

import { statusFileFor, markStatus, shouldSkipRun } from "./distributed-listener/distributed/status.js";

import { cancelFileFor, isCancelled } from "./distributed-listener/distributed/cancel.js";

import { runRequest } from "./distributed-listener/run/runRequest.js";

import { isPidAlive, forceKillProcessTree } from "./distributed-listener/run/process.js";

import { applyVariantToArgv, claimVariantForAgent } from "./distributed-listener/variant/claim.js";

import { agentHeartbeatFileFor, writeAgentHeartbeat } from "./distributed-listener/agents/heartbeat.js";

import { listAgents, printAgentList } from "./distributed-listener/agents/list.js";

import { cleanupOldRuns } from "./distributed-listener/cleanup/cleanupOldRuns.js";



const runningChildren = new Map(); // runId -> ChildProcess



async function main() {

  const opts = parseArgs(process.argv);

  if (opts.help) {

    printHelp(0);

  }

  if (!opts.distributedPath) {

    printHelp(1);

  }



  const dirs = buildDistributedDirs(opts.distributedPath);



  // `--list` phải nhanh và ít tác động: không tạo thư mục hay cleanup trên network share. 

  if (opts.list) {

    printAgentList({ agentsDir: dirs.agentsDir, ttlMs: opts.agentTtlMs });

    process.exit(0);

  }



  ensureDir(dirs.requestsDir);

  ensureDir(dirs.runsDir);

  ensureDir(dirs.reportsDir);

  ensureDir(dirs.workspacesDir);

  ensureDir(dirs.agentsDir);



  if (opts.debug) {

    console.log(`[uk6-distributed] Listener ready: agentId=${opts.agentId} nodeId=${opts.nodeId} shared=${opts.distributedPath}`);

  }



  // Cleanup khi khởi động: run/report/workspace cũ hơn 1 ngày

  // Trên SMB share, cleanup phải nông và không chặn nhặt request mới. 

  if (opts.startupCleanup) {

    if (opts.once) {

      cleanupOldRuns({ dirs, maxAgeMs: 24 * 60 * 60 * 1000, debug: opts.debug });

    } else {

      setTimeout(() => {

        try {

          cleanupOldRuns({ dirs, maxAgeMs: 24 * 60 * 60 * 1000, debug: opts.debug });

        } catch (_) {

          // ignore

        }

      }, 0);

    }

  }



  const scan = () => {

    // Heartbeat

    try {

      writeAgentHeartbeat({

        agentsDir: dirs.agentsDir,

        agentId: opts.agentId,

        patch: {

          schemaVersion: 1,

          tool: "uk6",

          agentId: opts.agentId,

          nodeId: opts.nodeId,

          pid: process.pid,

          hostname: os.hostname(),

          cwd: process.cwd(),

          lastSeenEpochMs: Date.now(),

          state: runningChildren.size > 0 ? "running" : "idle",

          runningRunIds: Array.from(runningChildren.keys()),

        },

      });

    } catch (_) {

      // ignore heartbeat errors

    }



    const files = listRequestFiles(dirs.requestsDir);

    for (const filePath of files) {

      let request = safeReadJson(filePath);

      if (!request || !request.runId) {

        if (opts.debug) console.error(`[uk6-distributed] Invalid request: ${filePath}`);

        continue;

      }



      const expiresAt = Number(request.expiresAtEpochMs || 0);

      if (expiresAt && Number.isFinite(expiresAt) && Date.now() > expiresAt) {

        if (tryDeleteFile(filePath)) {

          console.log(`[uk6-distributed] Cleaned expired request: ${path.basename(filePath)}`);

        }

        continue;

      }



      const runId = request.runId;

      if (isCancelled({ runsDir: dirs.runsDir, runId })) {

        markStatus({

          runsDir: dirs.runsDir,

          runId,

          nodeId: opts.nodeId,

          patch: {

            runId,

            nodeId: opts.nodeId,

            state: "cancelled",

            cancelledAtEpochMs: Date.now(),

          },

        });

        continue;

      }



      // Biến cho distributed: mỗi agent claim một dòng variant rồi áp dụng vào `argv` `-e KEY=VALUE`. 

      if (request.variant && request.variant.fileRel) {

        try {

          const claim = claimVariantForAgent({

            dirs,

            request,

            runId,

            agentId: opts.agentId,

            nodeId: opts.nodeId,

            debug: opts.debug,

          });



          if (claim && claim.noVariantAvailable) {

            markStatus({

              runsDir: dirs.runsDir,

              runId,

              nodeId: opts.nodeId,

              patch: {

                runId,

                nodeId: opts.nodeId,

                state: "no_variant_available",

                finishedAtEpochMs: Date.now(),

              },

            });

            continue;

          }



          if (claim && claim.vars) {

            request = { ...request, argv: applyVariantToArgv(request.argv, claim.vars) };

          }

        } catch (err) {

          // Không để việc claim variant làm hỏng run distributed

          if (opts.debug) {

            console.error(

              `[uk6-distributed] Variant handling failed: runId=${runId} agentId=${opts.agentId}`,

              err?.message || err

            );

          }

        }

      }



      if (shouldSkipRun({ runsDir: dirs.runsDir, runId, nodeId: opts.nodeId })) {

        continue;

      }



      runRequest({

        runnerJs: opts.runnerJs,

        request,

        nodeId: opts.nodeId,

        runsDir: dirs.runsDir,

        distributedSharedPath: opts.distributedPath,

        internalRoot: dirs.internalRoot,

        agentId: opts.agentId,

        debug: opts.debug,

        runningChildren,

      });

    }



    // Dừng child process nếu có signal hủy 

    for (const [runId, child] of runningChildren.entries()) {

      if (!child || child.killed) continue;

      if (!isCancelled({ runsDir: dirs.runsDir, runId })) continue;



      try {

        markStatus({

          runsDir: dirs.runsDir,

          runId,

          nodeId: opts.nodeId,

          patch: {

            runId,

            nodeId: opts.nodeId,

            // Đánh dấu hủy ngay khi quan sát tín hiệu hủy, không chờ runner process thoát hẳn

            state: "cancelled",

            cancelRequestedAtEpochMs: Date.now(),

            cancelledAtEpochMs: Date.now(),

          },

        });

      } catch (_) {

        // ignore

      }



      if (opts.debug) console.log(`[uk6-distributed] Cancelling runId=${runId} (nodeId=${opts.nodeId})`);



      try {

        child.kill("SIGINT");

      } catch (_) {

        // ignore

      }

      setTimeout(() => {

        try {

          if (!child.killed) child.kill("SIGTERM");

        } catch (_) {

          // ignore

        }

      }, 3000);

      setTimeout(() => {

        if (child && isPidAlive(child.pid)) {

          forceKillProcessTree(child, { debug: opts.debug, label: `runId=${runId}` });

        }

      }, 10000);

    }

  };



  scan();

  if (opts.once) {

    process.exit(0);

  }



  setInterval(scan, opts.pollMs);

}



main().catch((err) => {

  console.error("[uk6-distributed] Listener crashed:", err);

  process.exit(1);

});

