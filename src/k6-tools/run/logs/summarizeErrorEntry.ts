export function summarizeErrorEntry(entry: any) {

    function truncateStack(raw: string) {

        if (typeof raw !== 'string') return raw as any;



        const text = raw.replace(/\r\n/g, '\n');



        const MAX_FRAMES = 2;  // chỉ giữ lại 2 frames



        const isOneLineWithFrames = !text.includes('\n') && /\sat\s+.+\(/.test(text);

        const normalized = isOneLineWithFrames ? oneLineToMultilineStack(text) : text;

        return truncateMultilineStack(normalized, MAX_FRAMES);

    }



    function oneLineToMultilineStack(oneLine: string) {

        const idx = oneLine.indexOf(' at ');

        if (idx === -1) return oneLine;

        const header = oneLine.slice(0, idx).trim();

        const framesPart = oneLine.slice(idx + 4);

        const frames = framesPart

            .split(/\s+at\s+/g)

            .map((s) => s.trim())

            .filter(Boolean);



        return [header, ...frames.map((f) => `  at ${f}`)].join('\n');

    }



    function truncateMultilineStack(stackText: string, maxFrames: number) {

        const lines = stackText.split('\n');

        if (lines.length <= 2) return stackText.trim();



        const header = lines[0].trim();

        const rawFrames = lines

            .slice(1)

            .map((l) => l.trimEnd())

            .filter((l) => l.trim() !== '');



        // Loại bỏ các native frame ( hay có trong stack trace của k6 ) 

        const frames = rawFrames.filter((l) => !/\(native\)\s*$/.test(l) && !/^at\s+forEach\s+\(native\)\s*$/.test(l));



        const kept = frames.slice(0, maxFrames);

        const trimmed = Math.max(0, frames.length - kept.length);



        const out = [header, ...kept.map((l) => (l.startsWith('at ') ? `  ${l}` : l))];

        if (trimmed > 0) {

            out.push(`  ... (trimmed ${trimmed} frame${trimmed === 1 ? '' : 's'})`);

        }

        return out.join('\n').trim();

    }



    if (!entry) {

        return null;

    }



    if (typeof entry.msg === 'string') {

        return truncateStack(entry.msg);

    }



    if (entry.msg && typeof entry.msg === 'object') {

        if (

            (entry.msg.type === 'flow_step_exception' ||

                entry.msg.type === 'setup_exception' ||

                entry.msg.type === 'teardown_exception') &&

            entry.msg.error

        ) {

            return [

                `${entry.msg.type}: ${entry.msg.stepName || 'unknown-step'}`,

                entry.msg.error.message || null,

                entry.msg.error.stack ? truncateStack(entry.msg.error.stack) : null,

            ]

                .filter(Boolean)

                .join('\n');

        }



        try {

            return JSON.stringify(entry.msg);

        } catch (_) {

            return String(entry.msg);

        }

    }



    return null;

}



