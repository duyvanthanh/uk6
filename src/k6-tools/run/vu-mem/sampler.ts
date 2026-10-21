import { getProcessRssBytes } from './processRss.js';



export type VuMemSample = { t: number; rssBytes: number };



/**

 * Poll RSS/WorkingSet của process k6 theo interval và lưu lại samples.

 *

 * Lưu ý:

 * - Đây là sampling best-effort: có thể miss một vài điểm nếu process thoát nhanh hoặc OS không trả số liệu.

 * - Timer dùng `unref()` để không giữ Node process sống nếu phần còn lại đã kết thúc.

 */

export function startVuMemSampler(params: { enabled: boolean; pid: number | null; intervalMs: number }) {

    const { enabled, pid, intervalMs } = params;



    const samples: VuMemSample[] = [];

    let timer: any = null;



    if (enabled && pid && typeof pid === 'number') {

        const poll = () => {

            try {

                const rssBytes = getProcessRssBytes(pid);

                if (rssBytes == null) return;

                samples.push({ t: Date.now(), rssBytes });

            } catch (_) {

                // ignore

            }

        };



        poll();

        timer = setInterval(poll, intervalMs);

        if (timer && typeof timer.unref === 'function') timer.unref();

    }



    const stop = () => {

        if (!timer) return;

        try {

            clearInterval(timer);

        } catch (_) {

            // ignore

        } finally {

            timer = null;

        }

    };



    return { samples, stop };

}



