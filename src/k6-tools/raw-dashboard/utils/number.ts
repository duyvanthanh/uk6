

/** @internal Ép kiểu number an toàn; không hợp lệ trả về `null`. */

export function asNumber(value: number) {

    return typeof value === 'number' && Number.isFinite(value) ? value : null;

}



/** @internal Format số metric để hiển thị. */

export function formatMetric(value: number, decimals = 2) {

    if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return '-';

    return value.toFixed(decimals);

}

