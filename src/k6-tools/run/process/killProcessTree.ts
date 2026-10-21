import { spawnSync } from 'node:child_process';

import { isPidAlive } from './isPidAlive.js';



/** @internal Kill process tree trên Windows; trên OS khác cố gắng kill process chính. */

export function killProcessTree(pid: number, { debug, label } : { debug: any, label: any}) {

    try {

        if (!pid) return false;

        if (!isPidAlive(pid)) return true;



        if (process.platform === 'win32') {

            try {

                const res = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {

                    encoding: 'utf8',

                    windowsHide: true

                });

                if (debug) {

                    const out = `${res.stdout || ''}\n${res.stderr || ''}`.trim();

                    if (out) console.log(`[uk6] taskkill (${label || 'proc'} pid=${pid}):\n${out}`);

                }

                return true;

            } catch (_) {

                // ignore

            }

        }



        try {

            process.kill(pid, 'SIGKILL');

            return true;

        } catch (_) {

            return false;

        }

    } catch (_) {

        return false;

    }

}

