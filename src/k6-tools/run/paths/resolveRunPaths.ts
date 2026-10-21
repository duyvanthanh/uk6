import * as os from 'node:os';

import * as path from 'node:path';



export type RunPaths = {

    rawLogFile: string;

    filteredLogFile: string;

    rawConsoleLogFile: string;



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

    vuMemTempSummaryFile: string | null;

};



export function resolveRunPaths(params: { projectRoot: string; vuMemEnabled: boolean }) : RunPaths {

    const { projectRoot, vuMemEnabled } = params;



    const rawLogFile = path.join(projectRoot, 'error_log.raw.json');

    const filteredLogFile = path.join(projectRoot, 'error_log.json');

    const rawConsoleLogFile = path.join(projectRoot, 'error_log.console.log');

    const vuMemTempSummaryFile = vuMemEnabled

        ? path.join(os.tmpdir(), `uk6-vu-mem-summary.${process.pid}.${Date.now()}.json`)

        : null;



    const dashboardDir = path.join(projectRoot, 'dashboard-report');

    const dashboardFile = path.join(dashboardDir, 'api_dashboard.html');

    const dashboardLocalFile = path.join(dashboardDir, 'api_dashboard.local.html');

    const dashboardDistributedFile = path.join(dashboardDir, 'api_dashboard.distributed.html');

    const dashboardRawLogFile = path.join(dashboardDir, 'error_log.raw.json');

    const dashboardRawLogJsFile = path.join(dashboardDir, 'error_log.raw.js');

    const dashboardLocalRawLogFile = path.join(dashboardDir, 'error_log.raw.local.json');

    const dashboardLocalRawLogJsFile = path.join(dashboardDir, 'error_log.raw.local.js');

    const dashboardDistributedRawLogFile = path.join(dashboardDir, 'error_log.raw.distributed.json');

    const dashboardDistributedRawLogJsFile = path.join(dashboardDir, 'error_log.raw.distributed.js');



    return {

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

    };

}



