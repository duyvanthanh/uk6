// @ts-nocheck

import { runInspectCli } from './inspect/index.js';



runInspectCli()

    .then((exitCode) => process.exit(exitCode))

    .catch((err) => {

        console.error('Unexpected error while inspecting k6 script:', err && err.message ? err.message : err);

        process.exit(1);

    });



