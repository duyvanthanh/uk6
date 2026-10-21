

/** @internal Tính percentile trên mảng đã sort tăng dần. */

export function percentile(sorted: any, p: any) {

    if (!sorted.length) return null;

    const idx = Math.ceil((p / 100) * sorted.length) - 1;

    const nidx = Math.max(0, Math.min(sorted.length - 1, idx));

    return sorted[nidx];

}



/** @internal Tính thống kê duration (avg/min/max/p50/p90/p95/p99). */

export function computeDurationStats(durations: any) {

    if (!durations.length) {

        return { countWithDuration: 0, avg: null, min: null, max: null, p50: null, p90: null, p95: null, p99: null };

    }

    const sorted = [...durations].sort((a, b) => a - b);

    const sum = sorted.reduce((acc, n) => acc + n, 0);

    return {

        countWithDuration: sorted.length,

        avg: sum / sorted.length,

        min: sorted[0],

        max: sorted[sorted.length - 1],

        p50: percentile(sorted, 50),

        p90: percentile(sorted, 90),

        p95: percentile(sorted, 95),

        p99: percentile(sorted, 99)

    };

}

