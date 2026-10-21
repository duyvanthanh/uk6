function decodeQuotedToken(value: string) {
    try {
        return JSON.parse(`"${value}"`);
    } catch (_) {
        return value;
    }
}

function parseK6ConsoleWrapper(line: string) {
    const timeMatch = line.match(/time="((?:\\.|[^"])*)"/);
    const levelMatch = line.match(/\blevel=([a-zA-Z]+)/);
    const msgMatch = line.match(/\bmsg="((?:\\.|[^"])*)"/);
    if (!timeMatch || !levelMatch || !msgMatch) return null;

    const time = decodeQuotedToken(timeMatch[1]);
    const level = String(levelMatch[1] || "").toLowerCase() || "info";
    const msgText = decodeQuotedToken(msgMatch[1]);

    let msg: any = msgText;
    if (typeof msgText === "string") {
        const trimmed = msgText.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
                msg = JSON.parse(trimmed);
            } catch (_) {
                msg = msgText;
            }
        }
    }

    return { time, level, msg, source: "console" };
}

function parseLegacyConsoleLine(line: string, runStartEpochMs: number) {
    const match = String(line || "").trim().match(/^([A-Z]+)\[(\d+(?:\.\d+)?)\]\s*(.*)$/);
    if (!match) return null;

    const seconds = Number(match[2]);
    const upperLevel = String(match[1] || "INFO").toUpperCase();
    const message = match[3] || "";
    let level =
        upperLevel === "ERRO" || upperLevel === "ERROR"
            ? "error"
            : upperLevel === "WARN"
              ? "warning"
              : upperLevel === "DEBUG"
                ? "debug"
                : "info";

    let msg: any = message;
    const trimmed = message.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            msg = JSON.parse(trimmed);
        } catch (_) {
            msg = message;
        }
    }

    return {
        time: Number.isFinite(seconds) ? new Date(runStartEpochMs + seconds * 1000).toISOString() : new Date(runStartEpochMs).toISOString(),
        level,
        msg,
        source: "console",
    };
}

export function parseStructuredLine(line: string, runStartEpochMs: number) {
    const wrapper = parseK6ConsoleWrapper(line);
    if (wrapper) return wrapper;
    return parseLegacyConsoleLine(line, runStartEpochMs);
}

