import * as path from 'node:path';

import * as fs from 'node:fs';



/** @internal Xác định đường dẫn file thực thi k6 theo chế độ (`project`/`local`/auto). */

export function resolveK6Path(mode: string, projectRoot: any) {

    const projectK6Path = path.resolve(projectRoot, 'k6', 'k6.exe');



    if (mode === 'project') {

        if (!fs.existsSync(projectK6Path)) {

            console.error(`Requested --k6=project but k6 binary was not found at: ${projectK6Path}`);

            process.exit(1);

        }

        return projectK6Path;

    }



    if (mode === 'local') {

        return 'k6';

    }



    if (fs.existsSync(projectK6Path)) {

        return projectK6Path;

    }



    return 'k6';

}