/** @internal Lấy peak (max) của một mảng number-like; không hợp lệ trả `null`. */

export function computePeakNumber(values: any[]) {

    try {

        if (!Array.isArray(values) || values.length === 0) return null;

        let peak: number | null = null;

        for (const v of values) {

            const n = Number(v);

            if (!Number.isFinite(n)) continue;

            if (peak == null || n > peak) peak = n;

        }

        return peak;

    } catch (_) {

        return null;

    }

}



