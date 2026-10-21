import * as fs from 'node:fs';



export function cleanupRunArtifacts(filePaths: Array<string | null | undefined>) {

    (filePaths || []).forEach((file) => {

        if (!file) return;

        try {

            if (fs.existsSync(file)) {

                fs.unlinkSync(file);

            }

        } catch (_) {

            // ignore

        }

    });

}



