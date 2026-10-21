import { parseStructuredLine } from "./parseStructuredLine.js";


const STRUCTURED_TYPES = new Set([

    "setup_call",

    "setup_error",

    "setup_exception",

    "teardown_call",

    "teardown_error",

    "teardown_exception",

    "flow_step_call",

    "flow_step_error",

    "flow_step_exception",

    "concurrent_step_call",

    "concurrent_step_error",

    "vu_change",

]);



export function attachLiveOutputProcessing(params: {

    child: any;

    runStartEpochMs: number;

    liveStore: { add: (entry: any) => void } | null;

    stdout?: NodeJS.WriteStream;

    stderr?: NodeJS.WriteStream;

}) {

    const { child, runStartEpochMs, liveStore } = params;

    const stdout = params.stdout || process.stdout;
    const stderr = params.stderr || process.stderr;
    const drains: Promise<void>[] = [];

    function handleLine(line: string, writer: NodeJS.WriteStream) {
        const parsed = parseStructuredLine(line, runStartEpochMs);
        const msg = parsed && parsed.msg && typeof parsed.msg === "object" ? parsed.msg : null;
        const type = msg && typeof msg.type === "string" ? msg.type : null;

        if (parsed && type && STRUCTURED_TYPES.has(type)) {
            if (liveStore) liveStore.add(parsed);
            return;
        }

        writer.write(`${line}\n`);
    }

    function bindStream(stream: NodeJS.ReadableStream | null | undefined, writer: NodeJS.WriteStream) {
        if (!stream) return;
        drains.push(
            new Promise<void>((resolve) => {
                let buffer = "";
                let settled = false;

                function finish() {
                    if (settled) return;
                    settled = true;
                    if (buffer.length > 0) {
                        handleLine(buffer, writer);
                        buffer = "";
                    }
                    resolve();
                }

                stream.on("data", (chunk) => {
                    buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
                    let start = 0;
                    for (let i = 0; i < buffer.length; i += 1) {
                        const ch = buffer[i];
                        if (ch !== "\n" && ch !== "\r") continue;
                        const line = buffer.slice(start, i);
                        if (line.length > 0) {
                            handleLine(line, writer);
                        }
                        if (ch === "\r" && buffer[i + 1] === "\n") {
                            i += 1;
                        }
                        start = i + 1;
                    }
                    buffer = buffer.slice(start);
                });

                stream.once("end", finish);
                stream.once("close", finish);
            }),
        );
    }


    bindStream(child.stdout, stdout);

    bindStream(child.stderr, stderr);



    return {

        done: Promise.all(drains).then(() => undefined),

    };

}

