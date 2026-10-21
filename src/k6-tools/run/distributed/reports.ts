import * as fs from 'node:fs';

import * as os from 'node:os';

import * as path from 'node:path';



import { areExpectedAgentsSettled } from './agents';

import { getDistributedDirs } from './dirs';

import { copyDirRecursive, copyFileIfExists, readJsonArray, safeReadJson, writeJsonArrayFileStream, writeJsonArrayJsFileStream, writeJsonAtomic } from '../utils/fs';

import { sortRawEntriesByTime } from '../utils/sort';



export type PublishNodeReportsParams = {

    distributedSharedForReports: string;

    runId: string;

    nodeId: string;

    projectRoot: string;

    envName: string | null;

    generateDashboard: boolean;

    debugMode: boolean;

    dashboardFile: string;

    dashboardRawLogFile: string;

    dashboardRawLogJsFile: string;

    filteredLogFile: string;

    exitStatus: number | null;

};



export function publishNodeReportsToShared(params: PublishNodeReportsParams) {

    const {

        distributedSharedForReports,

        runId,

        nodeId,

        projectRoot,

        envName,

        generateDashboard,

        debugMode,

        dashboardFile,

        dashboardRawLogFile,

        dashboardRawLogJsFile,

        filteredLogFile,

        exitStatus,

    } = params;



    try {

        const dirs = getDistributedDirs(distributedSharedForReports);

        const nodeReportDir = path.join(dirs.reportsDir, runId, nodeId);

        if (!fs.existsSync(nodeReportDir)) {

            fs.mkdirSync(nodeReportDir, { recursive: true });

        }



        if (generateDashboard) {

            copyFileIfExists(dashboardFile, path.join(nodeReportDir, 'dashboard-report', 'api_dashboard.html'));

            copyFileIfExists(dashboardRawLogFile, path.join(nodeReportDir, 'dashboard-report', 'error_log.raw.json'));

            copyFileIfExists(dashboardRawLogJsFile, path.join(nodeReportDir, 'dashboard-report', 'error_log.raw.js'));

        }



        // Luôn copy error log nếu có

        copyFileIfExists(filteredLogFile, path.join(nodeReportDir, 'error_log.json'));



        writeJsonAtomic(path.join(nodeReportDir, 'meta.json'), {

            schemaVersion: 1,

            tool: 'uk6',

            runId,

            nodeId,

            cwd: projectRoot,

            env: envName || 'sit',

            dashboard: !!generateDashboard,

            exitCode: exitStatus == null ? 1 : exitStatus,

            finishedAtEpochMs: Date.now(),

        });



        writeJsonAtomic(path.join(dirs.runsDir, runId, 'nodes', nodeId, 'status.json'), {

            schemaVersion: 1,

            tool: 'uk6',

            runId,

            agentId: (process.env.UK6_AGENT_ID || os.hostname() || '').trim() || null,

            nodeId,

            state: 'done',

            exitCode: exitStatus == null ? 1 : exitStatus,

            finishedAtEpochMs: Date.now(),

        });



        if (debugMode) {

            console.log(`[uk6-distributed] Reports copied to shared folder: ${nodeReportDir}`);

        }

    } catch (copyErr: any) {

        if (debugMode) {

            console.error('[uk6-distributed] Failed to copy reports:', copyErr?.message || copyErr);

        }

    }

}



export async function collectNodeReportsToLocal({

    sharedFolder,

    runId,

    dashboardDir,

    distributedCleanupAfterMs,

    debugMode,

    sleep,

}: {

    sharedFolder: string;

    runId: string;

    dashboardDir: string;

    distributedCleanupAfterMs: number;

    debugMode: boolean;

    sleep: (ms: number) => Promise<any>;

}) {

    try {

        const dirs = getDistributedDirs(sharedFolder);

        const sharedRunReportsDir = path.join(dirs.reportsDir, runId);

        const localDistributedDir = path.join(dashboardDir, 'distributed', runId);

        const expectedAgentIds = (() => {

            try {

                const requestFile = path.join(dirs.requestsDir, `${runId}.json`);

                const req = safeReadJson(requestFile);

                const ids = (req as any)?.expectedAgents?.agentIds;

                return Array.isArray(ids) ? ids : [];

            } catch (_) {

                return [];

            }

        })();



        const deadline = Date.now() + Math.max(0, distributedCleanupAfterMs);

        let lastSnapshot: string | null = null;

        let stableCount = 0;



        const snapshot = () => {

            try {

                if (!fs.existsSync(sharedRunReportsDir)) return '';

                const parts: string[] = [];

                const walk = (dir: string) => {

                    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {

                        const p = path.join(dir, entry.name);

                        if (entry.isDirectory()) {

                            walk(p);

                        } else if (entry.isFile()) {

                            try {

                                const st = fs.statSync(p);

                                parts.push(`${path.relative(sharedRunReportsDir, p)}:${st.size}:${st.mtimeMs}`);

                            } catch (_) {

                                // ignore

                            }

                        }

                    }

                };

                walk(sharedRunReportsDir);

                return parts.sort().join('|');

            } catch (_) {

                return '';

            }

        };



        while (Date.now() <= deadline) {

            copyDirRecursive(sharedRunReportsDir, localDistributedDir);

            const nowSnap = snapshot();

            if (lastSnapshot != null && nowSnap === lastSnapshot) {

                stableCount += 1;

                if (stableCount >= 2) {

                    if (areExpectedAgentsSettled({ runsDir: dirs.runsDir, runId, expectedAgentIds })) {

                        break;

                    }

                }

            } else {

                stableCount = 0;

            }

            lastSnapshot = nowSnap;

            if (Date.now() + 2000 > deadline) break;

            await sleep(2000);

        }



        if (debugMode) {

            console.log(`[uk6-distributed] Collected node reports into: ${localDistributedDir}`);

        }

    } catch (_) {

        // ignore collection errors

    }

}



export function composeCombinedDashboardFromShared({

    sharedFolder,

    runId,

    dashboardDir,

    dashboardFile,

    dashboardLocalFile,

    dashboardDistributedFile,

    dashboardRawLogFile,

    dashboardRawLogJsFile,

    dashboardLocalRawLogFile,

    dashboardLocalRawLogJsFile,

    dashboardDistributedRawLogFile,

    dashboardDistributedRawLogJsFile,

    generateRawDashboard,

    rewriteDashboardHtmlDataSources,

}: {

    sharedFolder: string;

    runId: string;

    dashboardDir: string;

    dashboardFile: string;

    dashboardLocalFile: string;

    dashboardDistributedFile: string;

    dashboardRawLogFile: string;

    dashboardRawLogJsFile: string;

    dashboardLocalRawLogFile: string;

    dashboardLocalRawLogJsFile: string;

    dashboardDistributedRawLogFile: string;

    dashboardDistributedRawLogJsFile: string;

    generateRawDashboard: (rawEntries: any[], htmlFilePath: string) => any;

    rewriteDashboardHtmlDataSources: (htmlFilePath: string, opts: { rawJsonFileName: string; rawJsFileName: string }) => any;

}) {

    const dirs = getDistributedDirs(sharedFolder);

    const sharedRunReportsDir = path.join(dirs.reportsDir, runId);



    const mergedRawEntries: any[] = [];

    const nodes: any[] = [];



    if (fs.existsSync(sharedRunReportsDir)) {

        const nodeDirs = fs

            .readdirSync(sharedRunReportsDir, { withFileTypes: true })

            .filter((d) => d.isDirectory())

            .map((d) => d.name);



        for (const nodeId of nodeDirs) {

            const nodeRaw = path.join(sharedRunReportsDir, nodeId, 'dashboard-report', 'error_log.raw.json');

            const nodeEntries = readJsonArray(nodeRaw);

            if (nodeEntries && nodeEntries.length > 0) {

                mergedRawEntries.push(...nodeEntries);

                nodes.push({ nodeId, rawEntries: nodeEntries.length });

            } else {

                nodes.push({ nodeId, rawEntries: 0 });

            }

        }

    }



    if (mergedRawEntries.length <= 0) {

        console.error('[uk6-distributed] No agent raw logs found to compose combined dashboard.');

        return;

    }



    sortRawEntriesByTime(mergedRawEntries);



    // Giữ lại local dashboard; viết merged dashboard về `api_dashboard.html`.

    try {

        if (fs.existsSync(dashboardFile)) {

            if (fs.existsSync(dashboardLocalFile)) {

                fs.unlinkSync(dashboardLocalFile);

            }

            fs.renameSync(dashboardFile, dashboardLocalFile);

        }

        if (fs.existsSync(dashboardRawLogFile)) {

            if (fs.existsSync(dashboardLocalRawLogFile)) {

                fs.unlinkSync(dashboardLocalRawLogFile);

            }

            fs.renameSync(dashboardRawLogFile, dashboardLocalRawLogFile);

        }

        if (fs.existsSync(dashboardRawLogJsFile)) {

            if (fs.existsSync(dashboardLocalRawLogJsFile)) {

                fs.unlinkSync(dashboardLocalRawLogJsFile);

            }

            fs.renameSync(dashboardRawLogJsFile, dashboardLocalRawLogJsFile);

        }

    } catch (_) {

        // ignore rename errors

    }



    if (!fs.existsSync(dashboardDir)) {

        fs.mkdirSync(dashboardDir, { recursive: true });

    }



    // local dashboard đọc đúng local raw log

    rewriteDashboardHtmlDataSources(dashboardLocalFile, {

        rawJsonFileName: path.basename(dashboardLocalRawLogFile),

        rawJsFileName: path.basename(dashboardLocalRawLogJsFile),

    });



    // Viết merged raw logs dưới default filenames

    writeJsonArrayFileStream(dashboardRawLogFile, mergedRawEntries);

    writeJsonArrayJsFileStream(dashboardRawLogJsFile, '__RAW_LOG_DATA__', mergedRawEntries);



    writeJsonArrayFileStream(dashboardDistributedRawLogFile, mergedRawEntries);

    writeJsonArrayJsFileStream(dashboardDistributedRawLogJsFile, '__RAW_LOG_DATA__', mergedRawEntries);



    const summary = generateRawDashboard(mergedRawEntries, dashboardFile);

    copyFileIfExists(dashboardFile, dashboardDistributedFile);



    writeJsonAtomic(path.join(dashboardDir, 'distributed_summary.json'), {

        schemaVersion: 1,

        tool: 'uk6',

        runId,

        nodes,

        totalRawEntries: mergedRawEntries.length,

        summary,

        generatedAtEpochMs: Date.now(),

    });



    console.log(

        `[uk6-distributed] Combined dashboard generated: ${dashboardFile} (nodes=${nodes.length}, calls=${summary.totalCalls})`

    );

    console.log(`[uk6-distributed] Local-only dashboard saved as: ${dashboardLocalFile}`);

}



