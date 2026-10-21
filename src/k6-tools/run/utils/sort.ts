

/** @internal Sắp xếp các bản ghi raw log theo `time` nếu có. */

export function sortRawEntriesByTime(rawEntries: any) {

    try {

        rawEntries.sort((a: any, b: any) => {

            const ta = typeof a?.time === 'string' ? Date.parse(a.time) : NaN;

            const tb = typeof b?.time === 'string' ? Date.parse(b.time) : NaN;

            if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;

            if (Number.isFinite(ta)) return -1;

            if (Number.isFinite(tb)) return 1;

            return 0;

        });

    } catch (_) {

        // bỏ qua lỗi sort

    }

}

