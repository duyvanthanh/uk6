import * as fs from 'node:fs';

import * as path from 'node:path';



import { getDistributedCancelFilePath } from './dirs';

import { writeJsonAtomic } from '../utils/fs';



export function installDistributedCancelPropagation({

    sharedFolder,

    runId,

}: {

    sharedFolder: string;

    runId: string;

}) {

    const writeCancel = (signal: string | null) => {

        try {

            const cancelPath = getDistributedCancelFilePath(sharedFolder, runId);

            const cancelDir = path.dirname(cancelPath);

            if (!fs.existsSync(cancelDir)) fs.mkdirSync(cancelDir, { recursive: true });

            writeJsonAtomic(cancelPath, {

                schemaVersion: 1,

                tool: 'uk6',

                runId,

                signal: signal || null,

                cancelledAtEpochMs: Date.now(),

            });

            console.log(`[uk6-distributed] Cancellation signaled: runId=${runId} (signal=${signal})`);

        } catch (_) {

            // ignore

        }

    };



    process.on('SIGINT', () => {

        writeCancel('SIGINT');

        process.exit(130);

    });

    process.on('SIGTERM', () => {

        writeCancel('SIGTERM');

        process.exit(143);

    });

}



