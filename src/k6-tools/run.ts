// @ts-nocheck

import * as fs from 'node:fs';

import * as os from 'node:os';

import * as path from 'node:path';

import { buildForK6 } from './build-k6.js';

import { generateRawDashboard } from './raw-dashboard.js';

import { aggregateApiCalls } from './raw-dashboard/api/aggregateApiCalls.js';

import { getHelpText } from './run/cli/helpText.js';

import { parseArgs } from './run/cli/parseArgs.js';

import { 

    getFileSizeSafe, 

    copyFileIfExists, 

    copyDirRecursive, 

    safeReadJson, 

    readJsonArray

} from './run/utils/fs.js';

import { formatBytes } from './run/utils/bytes.js';

import { resolveK6Path } from './run/k6/resolveK6Path.js';

import { buildK6SpawnSpec } from './run/k6/buildSpawnSpec.js';

import { spawnK6, waitForExit } from './run/k6/spawnK6.js';

import { getLargeLogTruncateThresholdBytes, TRUNCATE_KEEP_FULL_DETAILS_FOR_FIRST_N_CALLS } from './run/config/logTruncation.js';

import { getDistributedDirs } from './run/distributed/dirs.js';

import { areExpectedAgentsSettled } from './run/distributed/agents.js';

import { emitDistributedRequest } from './run/distributed/request.js';

import { installDistributedCancelPropagation } from './run/distributed/cancel.js';

import { collectNodeReportsToLocal, composeCombinedDashboardFromShared, publishNodeReportsToShared } from './run/distributed/reports.js';

import { rewriteDashboardHtmlDataSources } from './run/dashboard/rewriteSources.js';

import { augmentK6ArgsForVuMem } from './run/vu-mem/augmentK6Args.js';

import { startVuMemSampler } from './run/vu-mem/sampler.js';

import { getSystemMemorySnapshot } from './run/vu-mem/systemMemory.js';

import { reportVuMem } from './run/vu-mem/report.js';

import { resolveRunPaths } from './run/paths/resolveRunPaths.js';

import { cleanupRunArtifacts } from './run/paths/cleanupRunArtifacts.js';

import { loadEnvFromFile } from './run/env/loadEnvFromFile.js';

import { buildChildEnv } from './run/env/buildChildEnv.js';

import { installCancellationHandlers } from './run/process/cancellation.js';

import { installAbortWithPostRunKey } from './run/process/abortKeys.js';

import { createLiveEventStore } from './run/live/liveEventStore.js';

import { attachLiveOutputProcessing } from './run/live/streamRunner.js';

import { buildDashboardHtml, startDashboardServer } from './run/live/dashboardServer.js';

import { openInDefaultBrowser } from './run/live/openInDefaultBrowser.js';



const projectRoot = process.cwd();



const LARGE_LOG_TRUNCATE_THRESHOLD_BYTES = getLargeLogTruncateThresholdBytes(process.env);



function sleep(ms: number) {

    return new Promise((resolve) => setTimeout(resolve, ms));

}



/**

 * @internal Main runner của CLI `uk6`.

 *

 * Luồng chính:

 * - Build/bundle script (Rollup) -> `.k6-build/.../*.bundle.js`

 * - (Tuỳ chọn) load `.env.<env>`

 * - Spawn `k6 run ...`

 * - Nếu bật file logging: đọc `error_log.raw.json` để lọc raw events và (tuỳ chọn) tạo dashboard

 */

async function run() {

    const argv = process.argv.slice(2);



    // Hỗ trợ `uk6 --inspect <script> ...` mà không đi qua parser của runner.

    // `cli.ts` chỉ là shim nên xử lý inspect ở đây cho thống nhất.

    if (argv.includes('--inspect')) {

        // eslint-disable-next-line @typescript-eslint/no-var-requires

        require('./inspect.js');

        return;

    }



    function printHelp({ exitCode = 0, errorMessage = null } = {}) {

        if (errorMessage) {

            console.error(errorMessage);

        }

        console.log(getHelpText({ defaultEnvName: 'sit' }));

        process.exit(exitCode);

    }



    // Hỗ trợ `uk6 --help` (không truyền script) và `uk6 <script> --help`.

    if (argv.includes('--help') || argv.includes('-h')) {

        printHelp({ exitCode: 0 });

    }



    // Hỗ trợ `uk6 <script> [options] [-- k6-args...]`.

    

    const parsedRes = parseArgs(argv, process.env);

    if (!parsedRes.ok) {

        console.error(parsedRes.errorMessage);

        process.exit(parsedRes.exitCode);

    }



    const parsed = parsedRes.value;



    const scriptPath = parsed.scriptPath;



    let envName = parsed.envName;

    let k6Mode = parsed.k6Mode;

    let keepRawLog = parsed.keepRawLog;

    let errorOnlyArtifact = parsed.errorOnlyArtifact;

    let generateDashboard = parsed.generateDashboard;

    let stepLogging = parsed.stepLogging;

    let debugMode = parsed.debugMode;

    let useProxy = parsed.useProxy;



    let vuMemEnabled = parsed.vuMemEnabled;

    let vuMemIntervalMs = parsed.vuMemIntervalMs;

    let vuMemSafety = parsed.vuMemSafety;



    let distributedSharedFolder = parsed.distributedSharedFolder;

    let distributedDelayMs = parsed.distributedDelayMs;

    let distributedCleanupAfterMs = parsed.distributedCleanupAfterMs;

    let distributedRunId = parsed.distributedRunId;

    let distributedNodeId = parsed.distributedNodeId;

    let distributedVariantFilePath = parsed.distributedVariantFilePath;

    let scheduledStartAtEpochMs = parsed.scheduledStartAtEpochMs;



    const distributedSharedFolderForReportsFromEnv = process.env.UK6_DISTRIBUTED_SHARED_PATH || null;

    const distributedRunIdFromEnv = process.env.UK6_DISTRIBUTED_RUN_ID || null;

    const distributedNodeIdFromEnv = process.env.UK6_DISTRIBUTED_NODE_ID || null;



    const extraArgs = parsed.extraArgs;

    if (!scriptPath) {

        printHelp({ exitCode: 1, errorMessage: 'Missing <script> argument.' });

    }



    const sourceRoot = process.env.UK6_SOURCE_ROOT ? path.resolve(process.env.UK6_SOURCE_ROOT) : projectRoot;

    const envFileName = envName ? `.env.${envName}` : '.env.sit';

    loadEnvFromFile({ filePath: path.join(sourceRoot, envFileName), env: process.env, overwrite: false });



    // Distributed: xác định định danh và (nếu là initiator) tạo request càng sớm càng tốt để listener có thời gian chuẩn bị trước giờ start.

    const effectiveNodeId =

        (distributedNodeId || distributedNodeIdFromEnv || null) || `${os.hostname()}-${process.pid}`;



    // Ưu tiên CLI `--distributed-run-id`, sau đó env var (listener set), nếu không có thì để null (initiator sẽ tự sinh khi dùng --distributed).

    let effectiveRunId = distributedRunId || distributedRunIdFromEnv || null;

    let distributedCancelHookInstalled = false;



    if (distributedSharedFolder) {

        if (!effectiveRunId) {

            effectiveRunId = `${new Date().toISOString().replace(/[:.]/g, '').replace('T', '-').replace('Z', '')}-${Math.random()

                .toString(16)

                .slice(2, 6)}`;

        }



        const emitted = emitDistributedRequest({

            sharedFolder: distributedSharedFolder,

            runId: effectiveRunId,

            projectRoot,

            distributedDelayMs,

            distributedCleanupAfterMs,

            distributedVariantFilePath,

            originalArgv: process.argv.slice(2),

        });

        scheduledStartAtEpochMs = emitted.startAtEpochMs;

    }



    // Distributed: khi initiator bị interupt (Ctrl+C), đẩy lệnh cancel cho listeners vào shared folder.

    if (distributedSharedFolder && effectiveRunId && !distributedCancelHookInstalled) {

        distributedCancelHookInstalled = true;

        installDistributedCancelPropagation({ sharedFolder: distributedSharedFolder, runId: effectiveRunId });    }



    const {

        rawLogFile,

        filteredLogFile,

        rawConsoleLogFile,

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

        vuMemTempSummaryFile,

    } = resolveRunPaths({ projectRoot, vuMemEnabled });



    cleanupRunArtifacts([

        rawLogFile,

        rawConsoleLogFile,

        filteredLogFile,

        dashboardFile,

        dashboardLocalFile,

        dashboardDistributedFile,

        dashboardRawLogFile,

        dashboardRawLogJsFile,

        dashboardLocalRawLogFile,

        dashboardLocalRawLogJsFile,

        dashboardDistributedRawLogFile,

        dashboardDistributedRawLogJsFile,

    ]);



    const k6Path = resolveK6Path(k6Mode, projectRoot);



    let builtScriptPath;

    try {

        builtScriptPath = await buildForK6(scriptPath, {

            treeshake: parsed.bundleTreeshake,

            sourcemap: parsed.bundleSourcemap,

            features: parsed.bundleFeatures,

        });

    } catch (err) {

        const errorMessage = err && err.message ? err.message : String(err);

        console.error(`Failed to build script for k6.\n${errorMessage}`);

        process.exit(1);

    }



    if (debugMode) {

        console.log(`[debug] builtScriptPath=${builtScriptPath}`);

        console.log(`[debug] k6Path=${k6Path}`);

    }



    let k6Args = [

        'run',

        builtScriptPath,

        ...extraArgs

    ];



    let vuMemAddedSummaryExport = false;

    let vuMemSummaryExportPath = null;

    if (vuMemEnabled) {

        const augmented = augmentK6ArgsForVuMem({

            enabled: true,

            k6Args,

            tempSummaryFilePath: vuMemTempSummaryFile,

        });

        k6Args = augmented.k6Args;

        vuMemAddedSummaryExport = augmented.addedSummaryExport;

        vuMemSummaryExportPath = augmented.summaryExportPath;

    }



    const effectiveStepLogging =

        stepLogging === 'auto'

            ? (generateDashboard ? ((debugMode || errorOnlyArtifact) ? 'full' : 'compact') : (errorOnlyArtifact ? 'full_error_only' : 'off'))

            : stepLogging === 'errors_only'

              ? 'compact'

              : stepLogging;

    const childEnv = buildChildEnv({

        baseEnv: {

            ...process.env,

            UK6_EVENT_LOG_MODE: effectiveStepLogging,

            UK6_STEP_LOGGING:

                effectiveStepLogging === 'compact'

                    ? 'errors_only'

                    : effectiveStepLogging,

        },

        useProxy

    });



    if (scheduledStartAtEpochMs && Date.now() < scheduledStartAtEpochMs) {

        const waitMs = Math.max(0, scheduledStartAtEpochMs - Date.now());

        if (waitMs > 0) {

            console.log(`[uk6-distributed] Waiting ${waitMs}ms to start...`);

            await new Promise((resolve) => setTimeout(resolve, waitMs));

        }

    }



    const runStartEpochMs = Date.now();

    const vuMemSystemAtStart = vuMemEnabled ? getSystemMemorySnapshot() : null;

    const liveStore =

        generateDashboard || errorOnlyArtifact

            ? createLiveEventStore({

                  dashboardRawLogFile,

                  dashboardRawLogJsFile,

                  persistRawFiles: generateDashboard,

                  errorLogFile: errorOnlyArtifact ? filteredLogFile : null,

              })

            : null;

    let liveDashboardServer: Awaited<ReturnType<typeof startDashboardServer>> | null = null;



    if (generateDashboard && liveStore) {

        liveDashboardServer = await startDashboardServer({

            dashboardFile,

            rawLogFile: dashboardRawLogFile,

            rawLogJsFile: dashboardRawLogJsFile,

            getHtml: () => buildDashboardHtml({ rawEntries: liveStore.getEntries(), aggregateApiCalls }),

            getRawEntries: () => liveStore.getEntries(),

            getStatus: () => ({

                completed: false,

                totalEvents: liveStore.getEntries().length,

            }),

        });

        process.stdout.write(`Dashboard live: ${liveDashboardServer.dashboardUrl}\n`);

        const openedLiveDashboard = openInDefaultBrowser(liveDashboardServer.dashboardUrl);

        if (!openedLiveDashboard) {

            console.log(`Failed to open browser automatically. Open: ${liveDashboardServer.dashboardUrl}`);

        }

    }



    const k6Spec = buildK6SpawnSpec(k6Path, k6Args);

    const k6Child = spawnK6({

        command: k6Spec.command,

        args: k6Spec.args,

        cwd: projectRoot,

        env: childEnv,

        options: k6Spec.options || {}

    });



    const liveOutput = attachLiveOutputProcessing({

        child: k6Child,

        runStartEpochMs,

        liveStore,

    });



    const vuMemSampler = startVuMemSampler({

        enabled: vuMemEnabled,

        pid: k6Child && k6Child.pid ? k6Child.pid : null,

        intervalMs: vuMemIntervalMs,

    });



    const cancellation = installCancellationHandlers({

        k6Child,        debugMode,

        onBeforeExit: () => {

            try {

                liveStore?.flushNow();

            } catch (_) {

                // ignore

            }

        },

    });



    const abortKeys = installAbortWithPostRunKey({

        cancellation,

        enabled: true,

        debugMode,

    });



    const result = await waitForExit(k6Child);

    await liveOutput.done;

    cancellation.uninstall();

    abortKeys.uninstall();



    vuMemSampler.stop();



    reportVuMem({

        enabled: vuMemEnabled,

        samples: vuMemSampler.samples,

        summaryFilePath: vuMemSummaryExportPath || vuMemTempSummaryFile,

        systemAtStart: vuMemSystemAtStart,

        safety: vuMemSafety,

        debugMode,

        formatBytes,

        safeReadJson,

        addedSummaryExport: vuMemAddedSummaryExport,

        tempSummaryFilePath: vuMemTempSummaryFile,

    });



    if (liveStore) {

        liveStore.flushNow();

    }



    if (generateDashboard && liveStore) {

        const finalEntries = liveStore.getEntries();

        if (!fs.existsSync(dashboardDir)) {

            fs.mkdirSync(dashboardDir, { recursive: true });

        }

        fs.writeFileSync(

            dashboardFile,

            buildDashboardHtml({ rawEntries: finalEntries, aggregateApiCalls }),

            'utf8'

        );

        console.log(

            `Dashboard generated: ${dashboardFile} (apis=${aggregateApiCalls(finalEntries).perApi.length}, calls=${finalEntries.length})`

        );

        const opened = openInDefaultBrowser(dashboardFile);

        if (!opened) {

            console.log(`Final dashboard file: ${dashboardFile}`);

        }

    }



    const buildDir = path.join(projectRoot, '.k6-build');

    try {

        if (fs.existsSync(buildDir)) {

            fs.rmSync(buildDir, { recursive: true, force: true });

        }

    } catch (_) {

        // bỏ qua lỗi xoá

    }



    // Distributed: sao chép reports/meta lên shared folder (áp dụng cho cả initiator và listener qua biến môi trường).

    const distributedSharedForReports = distributedSharedFolder || distributedSharedFolderForReportsFromEnv;

    if (distributedSharedForReports && effectiveRunId) {

        publishNodeReportsToShared({

            distributedSharedForReports,

            runId: effectiveRunId,

            nodeId: effectiveNodeId,

            projectRoot,

            envName,

            generateDashboard,

            debugMode,

            dashboardFile,

            dashboardRawLogFile,

            dashboardRawLogJsFile,

            filteredLogFile,

            exitStatus: result.status,

        });

    }

    

    if (distributedSharedFolder && effectiveRunId) {

        await collectNodeReportsToLocal({

            sharedFolder: distributedSharedFolder,

            runId: effectiveRunId,

            dashboardDir,

            distributedCleanupAfterMs,

            debugMode,

            sleep,

        });

    }



    // Initiator: gom tất cả report của node từ shared folder về `dashboard-report` local (cố gắng hết sức).

    // Initiator: tổng hợp dashboard cuối từ dashboard của tất cả agent.

    if (distributedSharedFolder && effectiveRunId && generateDashboard) {

        try {

            composeCombinedDashboardFromShared({

                sharedFolder: distributedSharedFolder,

                runId: effectiveRunId,

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

            });

        } catch (composeErr) {

            console.error('[uk6-distributed] Failed to compose combined dashboard:', composeErr.message || composeErr);

        }

    }

    if (liveDashboardServer) {

        await liveDashboardServer.close();

    }



    process.exit(result.status == null ? 1 : result.status);

}



run().catch((err) => {

    console.error('Unexpected error while running k6:', err);

    process.exit(1);

});







