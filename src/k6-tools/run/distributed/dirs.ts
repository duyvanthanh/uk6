import * as path from 'node:path';



/** @internal Tính các thư mục nội bộ của distributed trong thư mục chia sẻ. */

export function getDistributedDirs(sharedFolderPath: string) {

    const root = path.resolve(sharedFolderPath);

    const internalRoot = path.join(root, '.uk6-distributed');

    return {

        root,

        internalRoot,

        requestsDir: path.join(internalRoot, 'requests'),

        runsDir: path.join(internalRoot, 'runs'),

        reportsDir: path.join(internalRoot, 'reports'),

        workspacesDir: path.join(internalRoot, 'workspaces'),

        agentsDir: path.join(internalRoot, 'agents')

    };

}



/** @internal Đường dẫn file hủy run (initiator viết, listener đọc). */

export function getDistributedCancelFilePath(sharedFolderPath: string, runId: any) {

    const dirs = getDistributedDirs(sharedFolderPath);

    return path.join(dirs.runsDir, runId, 'cancel.json');

}