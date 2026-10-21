import * as fs from 'node:fs';

import * as path from 'node:path';



import { copyDirRecursive, copyFileIfExists, writeJsonAtomic } from '../utils/fs';

import { getDistributedDirs } from './dirs';

import { listOnlineAgentIds } from './agents';



export type EmitDistributedRequestParams = {

    sharedFolder: string;

    runId: string;

    projectRoot: string;

    distributedDelayMs: number;

    distributedCleanupAfterMs: number;

    distributedVariantFilePath: string | null;

    originalArgv: string[];

};



export type EmitDistributedRequestResult = {

    runId: string;

    startAtEpochMs: number;

    expiresAtEpochMs: number;

};



/** @internal Bắn distributed request và đẩy base workspace vào shared folder. */

export function emitDistributedRequest(params: EmitDistributedRequestParams): EmitDistributedRequestResult {

    const {

        sharedFolder,

        runId,

        projectRoot,

        distributedDelayMs,

        distributedCleanupAfterMs,

        distributedVariantFilePath,

        originalArgv,

    } = params;



    const createdAtEpochMs = Date.now();

    const startAtEpochMs = createdAtEpochMs + distributedDelayMs;

    const expiresAtEpochMs = startAtEpochMs + distributedCleanupAfterMs;



    const dirs = getDistributedDirs(sharedFolder);

    try {

        [dirs.requestsDir, dirs.runsDir, dirs.reportsDir, dirs.workspacesDir, dirs.agentsDir].forEach((p) => {

            if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });

        });

    } catch (_) {

        // 

    }



    // Distributed: copy source tree sang shared folder để listener chạy không cần repo/branch giống nhau --> IMPORTANT

    // Copy 1 lần cho mỗi run vào base workspace; mỗi listener sẽ clone sang node workspace riêng

    // để tránh đụng file output (error_log.raw.json, dashboard-report/, ...).

    try {

        const baseWorkspaceDir = path.join(dirs.workspacesDir, runId, 'base');

        copyDirRecursive(path.join(projectRoot, 'src'), path.join(baseWorkspaceDir, 'src'));

        copyDirRecursive(path.join(projectRoot, 'tests'), path.join(baseWorkspaceDir, 'tests'));

        copyDirRecursive(path.join(projectRoot, 'k6-report'), path.join(baseWorkspaceDir, 'k6-report'));



        // Copy `.env*` nếu có (không bắt buộc). Một số project dùng `.env.<env>`.

        try {

            const envCandidates = fs

                .readdirSync(projectRoot, { withFileTypes: true })

                .filter((e) => e.isFile() && e.name.toLowerCase().startsWith('.env'))

                .map((e) => e.name);

            for (const name of envCandidates) {

                copyFileIfExists(path.join(projectRoot, name), path.join(baseWorkspaceDir, name));

            }

        } catch (_) {

            // ignore

        }



        writeJsonAtomic(path.join(baseWorkspaceDir, 'uk6-distributed-workspace.json'), {

            schemaVersion: 1,

            tool: 'uk6',

            runId,

            createdAtEpochMs,

            sourceProjectRoot: projectRoot,

        });

    } catch (_) {

        // Nếu copy lỗi thì listener sẽ fail ở bước build/run.

    }



    // Distributed variant: copy variant pool sang shared folder để các agents claim từng dòng

    let variantFileRel: string | null = null;

    if (distributedVariantFilePath) {

        try {

            const variantsDir = path.join(dirs.internalRoot, 'variants');

            if (!fs.existsSync(variantsDir)) fs.mkdirSync(variantsDir, { recursive: true });

            const srcVariantAbs = path.isAbsolute(distributedVariantFilePath)

                ? distributedVariantFilePath

                : path.resolve(projectRoot, distributedVariantFilePath);

            const dstName = `${runId}.txt`;

            const dstAbs = path.join(variantsDir, dstName);

            copyFileIfExists(srcVariantAbs, dstAbs);

            // POSIX-like relative paths trong JSON đề phòng listeners khác platform

            variantFileRel = `variants/${dstName}`;

        } catch (_) {

            // 

        }

    }



    // Giữ argv nhưng bỏ distributed flags tránh vòng lặp; force start time bằng `--start-at-epoch-ms`.

    const forwardedArgv = originalArgv

        .filter((a) => {

            return !(

                a.startsWith('--distributed=') ||

                a.startsWith('--distributed-delay-ms=') ||

                a.startsWith('--distributed-run-id=') ||

                a.startsWith('--distributed-node-id=') ||

                a.startsWith('--distributed-variant=')

            );

        })

        .filter((a) => !a.startsWith('--start-at-epoch-ms='))

        .concat([`--start-at-epoch-ms=${startAtEpochMs}`]);



    const expectedAgentsTtlMs = 30000;

    const expectedAgentIds = listOnlineAgentIds(dirs.agentsDir, expectedAgentsTtlMs);



    const request = {

        schemaVersion: 1,

        tool: 'uk6',

        runId,

        createdAtEpochMs,

        startAtEpochMs,

        cleanupAfterMs: distributedCleanupAfterMs,

        expiresAtEpochMs,

        argv: forwardedArgv,

        workspace: {

            schemaVersion: 1,

            // Tương đối so với `<shared>/.uk6-distributed/`

            baseDir: path.join('workspaces', runId, 'base'),

        },

        expectedAgents: {

            schemaVersion: 1,

            ttlMs: expectedAgentsTtlMs,

            agentIds: expectedAgentIds,

        },

        variant: variantFileRel

            ? {

                  schemaVersion: 1,

                  // Tương đối so với `<shared>/.uk6-distributed/`

                  fileRel: variantFileRel,

              }

            : null,

    };



    const requestFile = path.join(dirs.requestsDir, `${runId}.json`);

    writeJsonAtomic(requestFile, request);

    console.log(

        `[uk6-distributed] Request emitted: runId=${runId}, startAt=${new Date(startAtEpochMs).toISOString()}, shared=${sharedFolder}`

    );



    return { runId, startAtEpochMs, expiresAtEpochMs };

}



