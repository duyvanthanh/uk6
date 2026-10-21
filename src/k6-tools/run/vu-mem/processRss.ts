import { spawnSync } from 'node:child_process';



/**

 * Đọc RSS bytes của một PID.

 *

 * - Windows: dùng WorkingSet64 (gần với “rss” theo nghĩa memory resident).

 * - POSIX: dùng `ps -o rss=` (KB) rồi đổi sang bytes.

 *

 * Trả `null` nếu không đọc được (PID chết, không đủ quyền, command không tồn tại...).

 */

export function getProcessRssBytes(pid: number) {

    try {

        if (!pid || typeof pid !== 'number') return null;



        if (process.platform === 'win32') {

            const ps = spawnSync(

                'powershell',

                ['-NoProfile', '-Command', `(Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty WorkingSet64)`],

                { encoding: 'utf8', windowsHide: true }

            );

            const raw = String(ps.stdout || '').trim();

            if (!raw) return null;

            const n = Number(raw);

            return Number.isFinite(n) && n >= 0 ? n : null;

        }



        const res = spawnSync('ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8' });

        const raw = String(res.stdout || '').trim();

        if (!raw) return null;

        const kb = Number(raw);

        return Number.isFinite(kb) && kb >= 0 ? kb * 1024 : null;

    } catch (_) {

        return null;

    }

}



