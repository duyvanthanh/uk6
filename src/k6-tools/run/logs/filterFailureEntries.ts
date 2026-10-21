function hasFailedCheck(checks: unknown) {
    if (!checks || typeof checks !== "object") return false;
    return Object.values(checks as Record<string, unknown>).some((value) => value === false);
}

function isErrorLikeType(type: unknown) {
    const text = String(type || "").toLowerCase();
    return text.includes("error") || text.includes("exception");
}

function isFailedStatus(status: unknown, method: unknown, endpoint: unknown) {
    const code = typeof status === "number" ? status : Number(status);
    if (!Number.isFinite(code)) return false;
    const m = String(method || "").toUpperCase().trim();
    const ep = String(endpoint || "").toLowerCase().trim();
    const isSql = m === "SQL" || ep === "sql";
    return isSql ? code !== 0 : code === 0 || code >= 400;
}

export function isFailureEntry(entry: any) {
    const msg = entry && entry.msg && typeof entry.msg === "object" ? entry.msg : null;
    if (!msg) {
        return String(entry && entry.level || "").toLowerCase() === "error";
    }

    const tags = msg && msg.tags && typeof msg.tags === "object" ? msg.tags : {};
    const response = msg && msg.response && typeof msg.response === "object" ? msg.response : {};
    const status = typeof response.status === "number" ? response.status : msg.status;
    const method = msg.method || (tags as any).method;
    const endpoint = (tags as any).endpoint;

    return (
        String(entry && entry.level || "").toLowerCase() === "error" ||
        isErrorLikeType(msg.type) ||
        hasFailedCheck(msg.checks) ||
        isFailedStatus(status, method, endpoint)
    );
}

export function filterFailureEntries(entries: any[]) {
    return (Array.isArray(entries) ? entries : []).filter(isFailureEntry);
}
