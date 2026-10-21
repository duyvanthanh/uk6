import * as fs from 'node:fs';



import { computePeakNumber } from './stats';

import { extractMaxVUsFromSummaryExport } from './summaryExport';



/**

 * In ra thống kê memory của k6 process.

 *

 * duyvt - 19/05/2026

 * Các số liệu là ước lượng do:

 * - sampling theo interval, không phải trace liên tục

 * - RSS/WorkingSet phụ thuộc OS

 * - “per‑VU” tính bằng cách chia cho `max_vus` từ k6 summary

 *

 * `avg_per_vu_est`/`peak_per_vu_est` cố gắng trừ baseline (RSS lúc đầu) để giảm nhiễu từ runtime.

 */

export function reportVuMem(params: {

    enabled: boolean;

    samples: Array<{ t: number; rssBytes: number }>;

    summaryFilePath: string | null;

    systemAtStart: { totalBytes: number; freeBytes: number } | null;

    safety: number;

    debugMode: boolean;

    formatBytes: (n: number) => string;

    safeReadJson: (filePath: string) => any;

    addedSummaryExport: boolean;

    tempSummaryFilePath: string | null;

}) {

    const {

        enabled,

        samples,

        summaryFilePath,

        systemAtStart,

        safety,

        debugMode,

        formatBytes,

        safeReadJson,

        addedSummaryExport,

        tempSummaryFilePath,

    } = params;



    if (!enabled) return;



    try {

        const baselineRssBytes = (() => {

            if (!samples || samples.length <= 0) return null;

            const takeN = Math.min(samples.length, 5);

            let min = Number.POSITIVE_INFINITY;

            for (let i = 0; i < takeN; i++) {

                const n = Number((samples[i] as any).rssBytes);

                if (!Number.isFinite(n)) continue;

                if (n < min) min = n;

            }

            return Number.isFinite(min) ? Math.round(min) : null;

        })();

        const avgRssBytes =

            samples && samples.length > 0

                ? samples.reduce((sum, s) => sum + (Number((s as any).rssBytes) || 0), 0) / samples.length

                : null;

        const peakRssBytes = computePeakNumber((samples || []).map((s) => s && (s as any).rssBytes));



        let maxVUs: number | null = null;

        if (summaryFilePath && fs.existsSync(summaryFilePath)) {

            const summary = safeReadJson(summaryFilePath);

            maxVUs = extractMaxVUsFromSummaryExport(summary);

        }



        const approxAvgPerVuBytes = avgRssBytes != null && maxVUs != null ? Math.round(avgRssBytes / maxVUs) : null;

        const approxPeakPerVuBytes = peakRssBytes != null && maxVUs != null ? Math.round(peakRssBytes / maxVUs) : null;



        const avgOverBaselineBytes =

            avgRssBytes != null && baselineRssBytes != null

                ? Math.max(0, Math.round(avgRssBytes - baselineRssBytes))

                : null;

        const peakOverBaselineBytes =

            peakRssBytes != null && baselineRssBytes != null

                ? Math.max(0, Math.round(peakRssBytes - baselineRssBytes))

                : null;



        const approxAvgPerVuEstBytes =

            avgOverBaselineBytes != null && maxVUs != null ? Math.round(avgOverBaselineBytes / maxVUs) : null;

        const approxPeakPerVuEstBytes =

            peakOverBaselineBytes != null && maxVUs != null ? Math.round(peakOverBaselineBytes / maxVUs) : null;



        const rssLabel = process.platform === 'win32' ? 'working_set' : 'rss';



        let suggestedMaxVUs: number | null = null;

        if (systemAtStart && approxAvgPerVuEstBytes != null && approxAvgPerVuEstBytes > 0) {

            const freeBytes = Number(systemAtStart.freeBytes);

            if (Number.isFinite(freeBytes) && freeBytes > 0) {

                suggestedMaxVUs = Math.max(1, Math.floor((freeBytes * safety) / approxAvgPerVuEstBytes));

            }

        }



        const parts = [

            `[uk6] k6 memory (approx):`,

            `avg_${rssLabel}=${avgRssBytes != null ? formatBytes(avgRssBytes) : 'n/a'}`,

            `peak_${rssLabel}=${peakRssBytes != null ? formatBytes(peakRssBytes) : 'n/a'}`,

            `max_vus=${maxVUs != null ? maxVUs : 'n/a'}`,

            `baseline_${rssLabel}=${baselineRssBytes != null ? formatBytes(baselineRssBytes) : 'n/a'}`,

            `avg_over_baseline=${avgOverBaselineBytes != null ? formatBytes(avgOverBaselineBytes) : 'n/a'}`,

            `peak_over_baseline=${peakOverBaselineBytes != null ? formatBytes(peakOverBaselineBytes) : 'n/a'}`,

            `avg_per_vu_est=${approxAvgPerVuEstBytes != null ? formatBytes(approxAvgPerVuEstBytes) : 'n/a'}`,

            `peak_per_vu_est=${approxPeakPerVuEstBytes != null ? formatBytes(approxPeakPerVuEstBytes) : 'n/a'}`,

            `avg_per_vu_raw=${approxAvgPerVuBytes != null ? formatBytes(approxAvgPerVuBytes) : 'n/a'}`,

            `peak_per_vu_raw=${approxPeakPerVuBytes != null ? formatBytes(approxPeakPerVuBytes) : 'n/a'}`,

        ];

        if (systemAtStart) {

            parts.push(`sys_free_at_start=${formatBytes(systemAtStart.freeBytes)}`);

            parts.push(`sys_total=${formatBytes(systemAtStart.totalBytes)}`);

            parts.push(`safety=${safety}`);

            parts.push(`suggested_max_vus=${suggestedMaxVUs != null ? suggestedMaxVUs : 'n/a'}`);

        }

        console.log(parts.join('\n'));

    } catch (err: any) {

        if (debugMode) {

            const msg = err && err.stack ? err.stack : err && err.message ? err.message : String(err);

            console.error(`[uk6][debug] vu-mem reporting failed: ${msg}`);

        }

    } finally {

        // Dọn temp summary file do uk6 tự tạo (không đụng file do user truyền vào `--summary-export`).

        if (addedSummaryExport) {

            try {

                if (tempSummaryFilePath && fs.existsSync(tempSummaryFilePath)) fs.unlinkSync(tempSummaryFilePath);

            } catch (_) {

                // ignore

            }

        }

    }

}

