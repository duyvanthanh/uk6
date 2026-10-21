/**

 * Trích `max_vus` từ file `--summary-export`.

 *

 * Hỗ trợ 2 format:

 * - Format cũ: `{ metrics: { vus: { max }, vus_max: { max } } }`

 * - Format machine-readable mới: `{ results: { metrics: [ { name, values:{max} } ] } }`

 *

 * Trả `null` nếu không đọc được.

 */

export function extractMaxVUsFromSummaryExport(summary: any) {

    try {

        if (!summary || typeof summary !== 'object') return null;



        // `summary-export` cũ của k6: `{ metrics: { vus: { max }, vus_max: { max } } }`. 

        if ((summary as any).metrics && typeof (summary as any).metrics === 'object') {

            const vusMetric = (summary as any).metrics.vus;

            const vusMaxMetric = (summary as any).metrics.vus_max;

            const candidate =

                (vusMaxMetric && typeof vusMaxMetric.max === 'number' ? vusMaxMetric.max : null) ||

                (vusMetric && typeof vusMetric.max === 'number' ? vusMetric.max : null);

            if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) return candidate;

        }



        // Format machine-readable mới: `{ results: { metrics: [ { name, values:{max} } ] } }`

        const metricsArray =

            (summary as any).results && Array.isArray((summary as any).results.metrics) ? (summary as any).results.metrics : null;

        if (metricsArray) {

            const byName = new Map<string, any>();

            for (const m of metricsArray) {

                if (!m || typeof m !== 'object') continue;

                if (typeof (m as any).name !== 'string') continue;

                byName.set((m as any).name, m);

            }

            const vusMax = byName.get('vus_max');

            const vus = byName.get('vus');

            const candidate =

                (vusMax && vusMax.values && typeof vusMax.values.max === 'number' ? vusMax.values.max : null) ||

                (vus && vus.values && typeof vus.values.max === 'number' ? vus.values.max : null);

            if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) return candidate;

        }



        return null;

    } catch (_) {

        return null;

    }

}



