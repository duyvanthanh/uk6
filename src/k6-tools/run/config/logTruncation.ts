/**

 * Log truncate khi file log đạt 1.9GB

 */

export function getLargeLogTruncateThresholdBytes(env: Record<string, string | undefined>) {

    const raw = env.UK6_LARGE_LOG_TRUNCATE_THRESHOLD_BYTES || env.UK6_LARGE_LOG_THRESHOLD_BYTES;

    if (raw == null || raw === '') return 1_900_000_000; // Ngưỡng an toàn khoảng 1.9GB (Node buffer là 2GB) 

    const n = Number(raw);

    if (!Number.isFinite(n) || n <= 0) return 1_900_000_000;

    return Math.floor(n);

}



export const TRUNCATE_KEEP_FULL_DETAILS_FOR_FIRST_N_CALLS = 20;



