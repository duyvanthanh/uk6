import * as fs from 'node:fs';



import { writeJsonArrayFileStream, writeJsonArrayJsFileStream } from '../utils/fs.js';



export async function generateDashboardArtifacts(params: {

    dashboardDir: string;

    dashboardFile: string;

    dashboardRawLogFile: string;

    dashboardRawLogJsFile: string;

    rawEntries: any[];

    truncateLargeLogs: boolean;

    largeLogThresholdBytes: number;

    keepFullDetailsForFirstNCalls: number;

    generateRawDashboard: (rawEntries: any[], htmlFilePath: string) => any;

}) {

    const {

        dashboardDir,

        dashboardFile,

        dashboardRawLogFile,

        dashboardRawLogJsFile,

        rawEntries,

        truncateLargeLogs,

        largeLogThresholdBytes,

        keepFullDetailsForFirstNCalls,

        generateRawDashboard,

    } = params;



    if (!fs.existsSync(dashboardDir)) {

        fs.mkdirSync(dashboardDir, { recursive: true });

    }



    if (truncateLargeLogs) {

        console.warn(

            `Raw log is very large (>=${Math.floor(largeLogThresholdBytes / 1_000_000)}MB); ` +

                `dashboard keeps all call counts/timings but truncates per-call detail after the first ${keepFullDetailsForFirstNCalls} calls.`

        );

    }



    writeJsonArrayFileStream(dashboardRawLogFile, rawEntries);

    writeJsonArrayJsFileStream(dashboardRawLogJsFile, '__RAW_LOG_DATA__', rawEntries);

    const summary = generateRawDashboard(rawEntries, dashboardFile);



    console.log(

        `Dashboard generated: ${dashboardFile} (apis=${summary.perApi.length}, calls=${summary.totalCalls}, errorRate=${summary.overallErrorRate.toFixed(2)}%)`

    );



    return summary;

}



