import * as fs from 'node:fs';



import { sortRawEntriesByTime } from '../utils/sort.js';
import { createMsgTruncator } from './truncation.js';
import { readConsoleOutput } from './readConsoleOutput.js';
import { readK6JsonLines } from './readK6JsonLines.js';
import { getRuntimeErrors } from './filterErrors.js';
import { summarizeErrorEntry } from './summarizeErrorEntry.js';
import { generateDashboardArtifacts } from '../dashboard/generate.js';


export async function processPostRunLogs(params: {

    logToFile: boolean;
    generateDashboard: boolean;
    keepRawLog: boolean;

    rawConsoleLogFile: string;
    rawLogFile: string;

    filteredLogFile: string;



    dashboardDir: string;

    dashboardFile: string;

    dashboardRawLogFile: string;

    dashboardRawLogJsFile: string;



    runStartEpochMs: number;

    resultStatus: number | null | undefined;



    largeLogTruncateThresholdBytes: number;

    keepFullDetailsForFirstNCalls: number;



    getFileSizeSafe: (filePath: string) => number | null;

    generateRawDashboard: (rawEntries: any[], htmlFilePath: string) => any;

}) {

    const {

        logToFile,
        generateDashboard,
        keepRawLog,
        rawConsoleLogFile,
        rawLogFile,
        filteredLogFile,

        dashboardDir,

        dashboardFile,

        dashboardRawLogFile,

        dashboardRawLogJsFile,

        runStartEpochMs,

        resultStatus,

        largeLogTruncateThresholdBytes,

        keepFullDetailsForFirstNCalls,

        getFileSizeSafe,

        generateRawDashboard,

    } = params;



    if (!logToFile) {
        if (generateDashboard) {
            console.error('Dashboard generation requires file logging. Remove --log-console.');
        }
        return;
    }


    try {

        const entries: any[] = [];

        const rawEntries: any[] = [];



        const consoleSize = getFileSizeSafe(rawConsoleLogFile) || 0;

        const logSize = getFileSizeSafe(rawLogFile) || 0;

        const truncateLargeLogs = Math.max(consoleSize, logSize) >= largeLogTruncateThresholdBytes;



        const pushRaw = (entry: any) => rawEntries.push(entry);

        const pushErrorEntry = (entry: any) => entries.push(entry);

        const truncateMsg = createMsgTruncator({

            enabled: truncateLargeLogs,

            keepFullDetailsForFirstNCalls,

        });



        await readConsoleOutput({

            filePath: rawConsoleLogFile,

            runStartEpochMs,

            truncateLargeLogs,

            truncateMsg,

            pushRaw,

            pushErrorEntry,

        });



        await readK6JsonLines({

            filePath: rawLogFile,

            truncateLargeLogs,

            truncateMsg,

            pushRaw,

            pushErrorEntry,

        });



        sortRawEntriesByTime(rawEntries);


        fs.writeFileSync(filteredLogFile, JSON.stringify(entries, null, 2), 'utf8');



        if (resultStatus !== 0) {

            const runtimeErrors = getRuntimeErrors(rawEntries);

            if (runtimeErrors.length > 0) {

                console.error('\n[k6-debug] Runtime error summary:');

                runtimeErrors.slice(0, 5).forEach((entry, idx) => {

                    const summary = summarizeErrorEntry(entry);

                    if (summary) {

                        console.error(`\n#${idx + 1}\n${summary}`);

                    }

                });

                if (runtimeErrors.length > 5) {

                    console.error(

                        `\n... ${runtimeErrors.length - 5} more runtime error(s). See error_log.raw.json for full details.`

                    );

                }

            }

        }



        if (generateDashboard) {

            try {

                await generateDashboardArtifacts({

                    dashboardDir,

                    dashboardFile,

                    dashboardRawLogFile,

                    dashboardRawLogJsFile,

                    rawEntries,

                    truncateLargeLogs,

                    largeLogThresholdBytes: largeLogTruncateThresholdBytes,

                    keepFullDetailsForFirstNCalls,

                    generateRawDashboard,

                });

            } catch (dashboardErr: any) {

                console.error(`Failed to generate dashboard: ${dashboardErr.message}`);

            }

        }



        if (keepRawLog) {

            // Giữ fil raw log gốc (NDJSON), kệ nó

            // WARNING: viết lại JSON array có thể vượt Node string/buffer limits 

        } else {

            try {

                fs.unlinkSync(rawLogFile);

            } catch (_) {

                // ignore

            }

        }



        // Luôn xóa console output sau parse

        try {

            if (fs.existsSync(rawConsoleLogFile)) {

                fs.unlinkSync(rawConsoleLogFile);

            }

        } catch (_) {

            // ignore

        }

    } catch (err: any) {

        console.error('Failed to filter error log:', err.message);

    }

}



