/**

 * Bổ sung cờ k6 để xuất summary (phục vụ ước lượng memory/VU)

 *

 * Quy ước:

 * - Nếu user đã truyền `--summary-export=...` thì dùng luôn (không override).

 * - Nếu chưa có, tự thêm `--new-machine-readable-summary` + `--summary-export=<temp>`.

 *

 * Lý do:

 * - Thống kê VU memory cần biết `max_vus` của run.

 * - `summary-export` là nguồn dữ liệu ổn định nhất từ k6, không cần parse log.

 */

export function augmentK6ArgsForVuMem(params: {

    enabled: boolean;

    k6Args: string[];

    tempSummaryFilePath: string;

}) {

    const { enabled, k6Args, tempSummaryFilePath } = params;



    const nextArgs = Array.isArray(k6Args) ? [...k6Args] : [];

    if (!enabled) {

        return { k6Args: nextArgs, addedSummaryExport: false, summaryExportPath: null as string | null };

    }



    const summaryExportArg = nextArgs.find((a) => String(a).startsWith('--summary-export=')) || null;

    if (summaryExportArg) {

        const p = String(summaryExportArg).slice('--summary-export='.length);

        return { k6Args: nextArgs, addedSummaryExport: false, summaryExportPath: p || null };

    }



    nextArgs.push('--new-machine-readable-summary');

    nextArgs.push(`--summary-export=${tempSummaryFilePath}`);

    return { k6Args: nextArgs, addedSummaryExport: true, summaryExportPath: tempSummaryFilePath };

}



