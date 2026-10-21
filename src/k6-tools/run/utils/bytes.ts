export function formatBytes(bytes: any) {

    const n = Number(bytes);

    if (!Number.isFinite(n) || n < 0) return String(bytes);

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];

    let v = n;

    let i = 0;

    while (v >= 1024 && i < units.length - 1) {

        v /= 1024;

        i += 1;

    }

    const fixed = i === 0 ? 0 : i === 1 ? 1 : 2;

    return `${v.toFixed(fixed)} ${units[i]}`;

}