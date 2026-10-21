import * as fs from 'node:fs';

import * as readline from 'node:readline';



import { truncateLongString } from './truncation.js';



export type ReadConsoleOutputParams = {

    filePath: string;

    runStartEpochMs: number;

    truncateLargeLogs: boolean;

    truncateMsg: (msg: any) => any;

    pushRaw: (entry: any) => void;

    pushErrorEntry: (entry: any) => void;

};



/**

 * Đọc file k6 console output và đẩy raw entries

 *

 */

export async function readConsoleOutput(params: ReadConsoleOutputParams) {

    const { filePath, runStartEpochMs, truncateLargeLogs, truncateMsg, pushRaw, pushErrorEntry } = params;



    if (!filePath || !fs.existsSync(filePath)) return;



    const rl = readline.createInterface({

        input: fs.createReadStream(filePath, { encoding: 'utf8' }),

        crlfDelay: Infinity,

    });



    for await (const line of rl) {

        const trimmed = String(line || '').trim();

        if (!trimmed) continue;



        // k6 console prefix: INFO[0001] <message>

        const m = trimmed.match(/^([A-Z]+)\[(\d+(?:\.\d+)?)\]\s*(.*)$/);

        const levelToken = m ? m[1] : null;

        const secondsToken = m ? m[2] : null;

        const message = m ? (m[3] || '') : trimmed;



        const seconds = secondsToken != null ? Number(secondsToken) : NaN;

        let time =

            Number.isFinite(seconds) && seconds >= 0

                ? new Date(runStartEpochMs + seconds * 1000).toISOString()

                : new Date(runStartEpochMs).toISOString();



        const upperLevel = String(levelToken || 'INFO').toUpperCase();

        let level =

            upperLevel === 'ERRO' || upperLevel === 'ERROR'

                ? 'error'

                : upperLevel === 'WARN'

                  ? 'warning'

                  : upperLevel === 'DEBUG'

                    ? 'debug'

                    : 'info';



        let msg: any = message;

        const msgTrimmed = message.trim();

        if (msgTrimmed.startsWith('{') || msgTrimmed.startsWith('[')) {

            try {

                msg = JSON.parse(msgTrimmed);

            } catch (_) {

                // keep string form

            }

        }



        // k6 console output có thể là JSON log wrapper, e.g.:

        // {"level":"info","msg":"{\"type\":\"flow_step_call\",...}","time":"..."} 

        if (msg && typeof msg === 'object' && typeof msg.msg === 'string' && typeof msg.level === 'string') {

            level = String(msg.level || level);

            if (typeof msg.time === 'string' && msg.time.trim()) {

                time = msg.time.trim();

            }

            const innerTrimmed = msg.msg.trim();

            if (innerTrimmed.startsWith('{') || innerTrimmed.startsWith('[')) {

                try {

                    msg = JSON.parse(innerTrimmed);

                } catch (_) {

                    msg = msg.msg;

                }

            } else {

                msg = msg.msg;

            }

        }



        // Luôn rút gọn stack JS một dòng, loại thường gặp ở runtime error, xuống còn vài frame. 

        // Cách này giảm bộ nhớ cho việc ghi log 

        if (typeof msg === 'string') {

            msg = truncateLongString(msg, Number.POSITIVE_INFINITY);

        }



        if (truncateLargeLogs) {

            if (msg && typeof msg === 'object') {

                msg = truncateMsg(msg);

            } else if (typeof msg === 'string') {

                msg = truncateLongString(msg);

            }

        }



        const entry = { time, level, msg, source: 'console' };

        pushRaw(entry);

        if (entry.level === 'error') {

            pushErrorEntry(entry);

        }

    }

}



