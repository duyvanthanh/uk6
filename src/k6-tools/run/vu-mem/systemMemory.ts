import { spawnSync } from 'node:child_process';

import * as os from 'node:os';



export type SystemMemorySnapshot = {

    totalBytes: number;

    freeBytes: number;

    source: 'win32_cim' | 'node_os';

};



/**

 * Lấy snapshot tổng/free memory của máy

 *

 * - Windows: ưu tiên CIM (Win32_OperatingSystem) để lấy FreePhysicalMemory/TotalVisibleMemorySize.

 * - Fallback: `os.totalmem()` / `os.freemem()`.

 *

 * Dùng để gợi ý `suggested_max_vus` (ước lượng) khi có số liệu per‑VU.

 */

export function getSystemMemorySnapshot(): SystemMemorySnapshot | null {

    try {

        // Windows: dùng CIM để có số liệu OS-level ổn định hơn, sau đó fallback về Node `os.*`.

        if (process.platform === 'win32') {

            const ps = spawnSync(

                'powershell',

                [

                    '-NoProfile',

                    '-Command',

                    // FreePhysicalMemory/TotalVisibleMemorySize đơn vị KB

                    '$os = Get-CimInstance Win32_OperatingSystem; ' +

                        '$free = [int64]$os.FreePhysicalMemory * 1024; ' +

                        '$total = [int64]$os.TotalVisibleMemorySize * 1024; ' +

                        'Write-Output ("{0} {1}" -f $total, $free)',

                ],

                { encoding: 'utf8', windowsHide: true }

            );

            const raw = String(ps.stdout || '').trim();

            const parts = raw.split(/\s+/).map((x) => Number(x));

            const totalBytes = parts.length >= 1 ? parts[0] : NaN;

            const freeBytes = parts.length >= 2 ? parts[1] : NaN;

            if (Number.isFinite(totalBytes) && totalBytes > 0 && Number.isFinite(freeBytes) && freeBytes >= 0) {

                return { totalBytes, freeBytes, source: 'win32_cim' };

            }

        }



        const totalBytes = os.totalmem();

        const freeBytes = os.freemem();

        if (Number.isFinite(totalBytes) && totalBytes > 0 && Number.isFinite(freeBytes) && freeBytes >= 0) {

            return { totalBytes, freeBytes, source: 'node_os' };

        }

        return null;

    } catch (_) {

        return null;

    }

}



