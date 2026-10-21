export type K6Mode = 'project' | 'local';

export type StepLoggingMode = 'auto' | 'full' | 'errors_only' | 'off';



export type ParsedArgs = {
    scriptPath: string | null;
    extraArgs: string[];

    envName: string | null;
    k6Mode: K6Mode | null;
    keepRawLog: boolean;
    errorOnlyArtifact: boolean;
    generateDashboard: boolean;
    stepLogging: StepLoggingMode;
    debugMode: boolean;
    useProxy: boolean;

    vuMemEnabled: boolean;
    vuMemIntervalMs: number;
    vuMemSafety: number;


    distributedSharedFolder: string | null;

    distributedDelayMs: number;

    distributedCleanupAfterMs: number;

    distributedRunId: string | null;

    distributedNodeId: string | null;

    distributedVariantFilePath: string | null;

    scheduledStartAtEpochMs: number | null;



    bundleTreeshake: boolean;

    bundleSourcemap: "off" | "inline" | "external";

    bundleFeatures: "auto" | "all" | "http" | "http,sql";

};



export type ParseArgsResult =
    | { ok: true; value: ParsedArgs }
    | { ok: false; exitCode: number; errorMessage: string };

function getRemovedOptionMessage(arg: string): string | null {
    if (arg === '--log-output=console') {
        return 'Unsupported uk6 option: --log-output=console. Use --log-console instead.';
    }
    if (arg === '--remove' || arg === '--remove=true' || arg === '--remove=false') {
        return 'Unsupported uk6 option: --remove. .k6-build cleanup now happens automatically after each run.';
    }
    if (arg === '--no-treeshake') {
        return 'Unsupported uk6 option: --no-treeshake. Use --treeshake=false instead.';
    }
    if (arg === '--no-proxy' || arg === '--no-proxy=true' || arg === '--no-proxy=false') {
        return 'Unsupported uk6 option: --no-proxy. Use --proxy=false instead.';
    }
    if (arg === '--ide-remote' || arg === '--ide-remote=true' || arg === '--ide-remote=false') {
        return 'Unsupported uk6 option: --ide-remote. IDEA remote integration has been removed.';
    }
    if (arg.startsWith('--ide-remote-port=')) {
        return 'Unsupported uk6 option: --ide-remote-port. IDEA remote integration has been removed.';
    }
    if (arg === '--ide-remote-auto=true' || arg === '--ide-remote-auto=false') {
        return 'Unsupported uk6 option: --ide-remote-auto. IDEA remote integration has been removed.';
    }
    if (arg === '--beautify' || arg === '--beautify=true' || arg === '--beautify=false') {
        return 'Unsupported uk6 option: --beautify. Beautify CLI compatibility has been removed.';
    }
    return null;
}


/**

 * Parse `uk6` argv vào runner options

 */

export function parseArgs(argv: string[], env: NodeJS.ProcessEnv): ParseArgsResult {

    // Support `uk6 <script> [options] [-- k6-args...]`.

    const dashDashIndex = argv.indexOf('--');

    const argvBeforeDashDash = dashDashIndex === -1 ? argv : argv.slice(0, dashDashIndex);

    const argvAfterDashDash = dashDashIndex === -1 ? [] : argv.slice(dashDashIndex + 1);



    // Cho uk6 options xuất hiện trước script path.

    const scriptIndex = argvBeforeDashDash.findIndex((token) => !token.startsWith('-'));

    const scriptPath = scriptIndex === -1 ? null : argvBeforeDashDash[scriptIndex];

    const rawExtraArgs = (scriptIndex === -1

        ? argvBeforeDashDash

        : argvBeforeDashDash.slice(0, scriptIndex).concat(argvBeforeDashDash.slice(scriptIndex + 1))

    ).concat(argvAfterDashDash);



    let envName: string | null = null;
    let k6Mode: K6Mode | null = null;
    let keepRawLog = false;
    let errorOnlyArtifact = false;
    let generateDashboard = false;
    let stepLogging: StepLoggingMode = 'auto';
    let debugMode = false;
    let useProxy = false;

    const bundleTreeshakeFromEnvRaw = String(env.UK6_TREESHAKE || "").trim().toLowerCase();
    let bundleTreeshake =

        bundleTreeshakeFromEnvRaw === "0" ||

        bundleTreeshakeFromEnvRaw === "false" ||

        bundleTreeshakeFromEnvRaw === "off"

            ? false

            : true;



    const bundleSourcemapFromEnvRaw = String(env.UK6_BUNDLE_SOURCEMAP || "").trim().toLowerCase();

    let bundleSourcemap: "off" | "inline" | "external" =

        bundleSourcemapFromEnvRaw === "inline"

            ? "inline"

            : bundleSourcemapFromEnvRaw === "external"

                ? "external"

                : "off";



    const bundleFeaturesFromEnvRaw = String(env.UK6_BUNDLE_FEATURES || "").trim().toLowerCase();

    let bundleFeatures: "auto" | "all" | "http" | "http,sql" =

        bundleFeaturesFromEnvRaw === "all"

            ? "all"

            : bundleFeaturesFromEnvRaw === "http"

                ? "http"

                : bundleFeaturesFromEnvRaw === "http,sql" || bundleFeaturesFromEnvRaw === "http+sql" || bundleFeaturesFromEnvRaw === "sql"

                    ? "http,sql"

                    : "auto";



    // Ước tính memory per VU: poll RSS/WorkingSet của k6.exe process và chia cho số max VUs.

    let vuMemEnabled =

        String(env.UK6_VU_MEM || '')

            .trim()

            .toLowerCase() === 'true' || String(env.UK6_VU_MEM || '').trim() === '1';

    let vuMemIntervalMs = (() => {

        const raw = env.UK6_VU_MEM_INTERVAL_MS;

        const n = Number(raw);

        return Number.isFinite(n) && n >= 200 ? Math.floor(n) : 1000;

    })();

    let vuMemSafety = (() => {

        const raw = env.UK6_VU_MEM_SAFETY;

        const n = Number(raw);

        return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.8;

    })();



    // Xử lý Distributed options (shared folder run)

    let distributedSharedFolder: string | null = null;

    let distributedDelayMs = 30000;

    let distributedCleanupAfterMs = 60000;

    let distributedRunId: string | null = null;

    let distributedNodeId: string | null = null;

    let distributedVariantFilePath: string | null = null;

    let scheduledStartAtEpochMs: number | null = null;



    const extraArgs: string[] = [];

    for (const arg of rawExtraArgs) {
        const removedOptionMessage = getRemovedOptionMessage(arg);
        if (removedOptionMessage) {
            return {
                ok: false,
                exitCode: 1,
                errorMessage: removedOptionMessage,
            };
        }
        if (arg === '--help' || arg === '-h') {
            // Help xử lý bởi caller
            continue;
        }
        if (arg.startsWith('--env=')) {
            envName = arg.slice('--env='.length).trim() || null;

        } else if (arg === '--k6=project') {

            k6Mode = 'project';

        } else if (arg === '--k6=local') {
            k6Mode = 'local';
        } else if (arg.startsWith('--k6=')) {
            return {
                ok: false,
                exitCode: 1,
                errorMessage: "Invalid value for --k6. Use 'project' or 'local'."
            };
        } else if (arg === '--raw=true') {
            keepRawLog = true;
        } else if (arg === '--raw=false' || arg === '--raw') {
            keepRawLog = false;
        } else if (arg === '--error=true' || arg === '--error') {
            errorOnlyArtifact = true;
        } else if (arg === '--error=false') {
            errorOnlyArtifact = false;
        } else if (arg === '--log-console') {
            // Compatibility flag kept for help/API surface; runtime now streams the same way regardless.
        } else if (arg === '--dashboard=true' || arg === '--dashboard') {
            generateDashboard = true;
        } else if (arg === '--dashboard=false') {
            generateDashboard = false;
        } else if (arg.startsWith('--step-logs=')) {

            const raw = arg.slice('--step-logs='.length).trim().toLowerCase();

            if (raw === 'auto' || raw === 'full' || raw === 'off') {

                stepLogging = raw as StepLoggingMode;

            } else if (raw === 'errors-only' || raw === 'errors_only' || raw === 'errorsonly') {

                stepLogging = 'errors_only';

            } else {

                return {

                    ok: false,

                    exitCode: 1,

                    errorMessage: "Invalid value for --step-logs. Use 'auto', 'full', 'errors-only', or 'off'."

                };

            }

        } else if (arg.startsWith('--distributed=')) {

            distributedSharedFolder = arg.slice('--distributed='.length).trim() || null;

        } else if (arg.startsWith('--distributed-delay-ms=')) {

            const parsedDelay = Number(arg.slice('--distributed-delay-ms='.length));

            if (Number.isFinite(parsedDelay) && parsedDelay >= 0) {

                distributedDelayMs = parsedDelay;

            }

        } else if (arg.startsWith('--distributed-cleanup-after-ms=')) {

            const parsedCleanup = Number(arg.slice('--distributed-cleanup-after-ms='.length));

            if (Number.isFinite(parsedCleanup) && parsedCleanup >= 0) {

                distributedCleanupAfterMs = parsedCleanup;

            }

        } else if (arg.startsWith('--distributed-run-id=')) {

            distributedRunId = arg.slice('--distributed-run-id='.length).trim() || null;

        } else if (arg.startsWith('--distributed-node-id=')) {

            distributedNodeId = arg.slice('--distributed-node-id='.length).trim() || null;

        } else if (arg.startsWith('--distributed-variant=')) {

            distributedVariantFilePath = arg.slice('--distributed-variant='.length).trim() || null;

        } else if (arg.startsWith('--start-at-epoch-ms=')) {

            const parsedStartAt = Number(arg.slice('--start-at-epoch-ms='.length));

            if (Number.isFinite(parsedStartAt) && parsedStartAt > 0) {

                scheduledStartAtEpochMs = parsedStartAt;

            }

        } else if (arg === '--debug=true' || arg === '--debug') {

            debugMode = true;

        } else if (arg === '--debug=false') {

            debugMode = false;

        } else if (arg === '--treeshake' || arg === '--treeshake=true') {
            bundleTreeshake = true;
        } else if (arg === '--treeshake=false') {
            bundleTreeshake = false;
        } else if (arg.startsWith('--bundle-sourcemap=')) {
            const raw = arg.slice('--bundle-sourcemap='.length).trim().toLowerCase();
            if (raw === 'off' || raw === 'inline' || raw === 'external') {
                bundleSourcemap = raw as "off" | "inline" | "external";

            } else {

                return {

                    ok: false,

                    exitCode: 1,

                    errorMessage: "Invalid value for --bundle-sourcemap. Use 'off', 'inline', or 'external'."

                };

            }

        } else if (arg.startsWith('--bundle-features=')) {

            const raw = arg.slice('--bundle-features='.length).trim().toLowerCase();

            if (raw === 'auto' || raw === 'all' || raw === 'http') {

                bundleFeatures = raw as "auto" | "all" | "http";

            } else if (raw === 'http,sql' || raw === 'http+sql' || raw === 'sql') {

                bundleFeatures = "http,sql";

            } else {

                return {

                    ok: false,

                    exitCode: 1,

                    errorMessage: "Invalid value for --bundle-features. Use 'auto', 'all', 'http', or 'http,sql'."

                };

            }

        } else if (arg === '--vu-mem=true' || arg === '--vu-mem') {

            vuMemEnabled = true;

        } else if (arg === '--vu-mem=false') {

            vuMemEnabled = false;

        } else if (arg.startsWith('--vu-mem-interval-ms=')) {

            const n = Number(arg.slice('--vu-mem-interval-ms='.length));

            if (Number.isFinite(n) && n >= 200) vuMemIntervalMs = Math.floor(n);

        } else if (arg.startsWith('--vu-mem-safety=')) {
            const n = Number(arg.slice('--vu-mem-safety='.length));
            if (Number.isFinite(n) && n > 0 && n <= 1) vuMemSafety = n;
        } else if (arg === '--proxy=true' || arg === '--proxy') {
            useProxy = true;
        } else if (arg === '--proxy=false') {
            useProxy = false;
        } else {
            extraArgs.push(arg);
        }
    }



    // Log Explorer đọc từ `error_log.raw.json`, nên khi --dashboard cần keep raw log.

    if (generateDashboard) {

        keepRawLog = true;

    }



    return {

        ok: true,

        value: {

            scriptPath,
            extraArgs,

            envName,
            k6Mode,
            keepRawLog,
            errorOnlyArtifact,
            generateDashboard,
            stepLogging,
            debugMode,
            useProxy,

            vuMemEnabled,
            vuMemIntervalMs,
            vuMemSafety,



            distributedSharedFolder,

            distributedDelayMs,

            distributedCleanupAfterMs,

            distributedRunId,

            distributedNodeId,

            distributedVariantFilePath,

            scheduledStartAtEpochMs,



            bundleTreeshake,

            bundleSourcemap,

            bundleFeatures,

        }

    };

}

