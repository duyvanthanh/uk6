import * as fs from 'node:fs';

import * as readline from 'node:readline';



import { truncateLongString } from './truncation.js';



export type ReadK6JsonLinesParams = {

    filePath: string;

    truncateLargeLogs: boolean;

    truncateMsg: (msg: any) => any;

    pushRaw: (entry: any) => void;

    pushErrorEntry: (entry: any) => void;

};



/**

 * Đọc JSON logs nội bộ củia k6 (1 JSON object / 1 line).

 *

 */

export async function readK6JsonLines(params: ReadK6JsonLinesParams) {

    const { filePath, truncateLargeLogs, truncateMsg, pushRaw, pushErrorEntry } = params;



    if (!filePath || !fs.existsSync(filePath)) return;



    const rl = readline.createInterface({

        input: fs.createReadStream(filePath, { encoding: 'utf8' }),

        crlfDelay: Infinity,

    });



    for await (const line of rl) {

        if (!line) continue;

        try {

            const entry: any = JSON.parse(line);

            if (!entry) continue;



            // Luôn rút gọn stack JS một dòng, loại thường gặp ở runtime error, xuống còn vài frame. 

            // Cách này giảm bộ nhớ cho việc ghi log 

            if (typeof entry.msg === 'string') {

                entry.msg = truncateLongString(entry.msg, Number.POSITIVE_INFINITY);

            }



            if (truncateLargeLogs) {

                if (entry.msg && typeof entry.msg === 'object') {

                    entry.msg = truncateMsg(entry.msg);

                } else if (typeof entry.msg === 'string') {

                    entry.msg = truncateLongString(entry.msg);

                }

            }



            pushRaw(entry);



            if (entry.level === 'error') {

                pushErrorEntry(entry);

            } else if (entry.level === 'warning' && entry.msg === 'Request Failed') {

                pushErrorEntry(entry);

            }

        } catch (_) {

            // bỏ qua line không valid

        }

    }

}



