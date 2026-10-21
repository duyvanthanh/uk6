export type TruncationOptions = {

    enabled: boolean;

    keepFullDetailsForFirstNCalls: number;

};



/**

 * Logic truncate

 * 

 * Nếu nhìn giống log API, khi truncate sẽ xóa toàn bộ nội dung chỉ giữ response status và check status

 * @param opts 

 * @returns 

 */

export function createMsgTruncator(opts: TruncationOptions) {

    let apiCallLikeCount = 0;



    return function truncateMsg(msg: any) {

        if (!opts?.enabled) return msg;

        if (!msg || typeof msg !== 'object') return msg;

        if (

            msg.type !== 'flow_step_call' &&

            msg.type !== 'flow_step_error' &&

            msg.type !== 'concurrent_step_call' &&

            msg.type !== 'concurrent_step_error' &&

            msg.type !== 'setup_call' &&

            msg.type !== 'setup_error' &&

            msg.type !== 'teardown_call' &&

            msg.type !== 'teardown_error'

        )

            return msg;



        apiCallLikeCount += 1;

        if (apiCallLikeCount <= opts.keepFullDetailsForFirstNCalls) return msg;



        const checks = msg.checks && typeof msg.checks === 'object' ? msg.checks : null;

        const tags = msg.tags && typeof msg.tags === 'object' ? msg.tags : null;

        const response = msg.response && typeof msg.response === 'object' ? msg.response : null;

        const timings = response && response.timings && typeof response.timings === 'object' ? response.timings : null;

        const status =

            (response && typeof response.status === 'number' ? response.status : null) ??

            (typeof msg.status === 'number' ? msg.status : null) ??

            null;

        const duration =

            timings && typeof timings.duration === 'number' && Number.isFinite(timings.duration) ? timings.duration : null;



        return {

            type: msg.type,

            flowName: msg.flowName,

            stepName: msg.stepName,

            stepIndex: msg.stepIndex,

            method: msg.method || (tags ? tags.method : undefined),

            url: msg.url || (tags ? tags.endpoint : undefined),

            tags: tags

                ? {

                      name: tags.name,

                      endpoint: tags.endpoint,

                      method: tags.method,

                  }

                : null,

            status,

            response: { status, timings: { duration } },

            checks: checks || null,

        };

    };

}



export function truncateLongString(s: string, maxLen = 2000) {

    if (typeof s !== 'string') return s;



    // Nếu nhìn như JS error stack thì cắt stack frames để giảm bộ nhớ

    const stackTrimmed = truncateJsStack(s);

    if (stackTrimmed !== s) {

        return stackTrimmed;

    }



    if (s.length <= maxLen) return s;

    return s.slice(0, maxLen) + '... [truncated]';

}



function truncateJsStack(raw: string) {

    const text = String(raw || '').replace(/\r\n/g, '\n').trim();

    if (!text) return raw;



    const looksLikeError =

        /Error:/.test(text) ||

        /ReferenceError:/.test(text) ||

        /TypeError:/.test(text) ||

        /SyntaxError:/.test(text) ||

        /RangeError:/.test(text);

    if (!looksLikeError) return raw;



    // Must contain at least one "at ..." frame.

    if (!/\bat\s+.+\(/.test(text)) return raw;



    const MAX_FRAMES = 2;



    // Stack nhiều dòng: dòng đầu là header, các dòng sau là frame 

    if (text.includes('\n')) {

        const lines = text.split('\n').map((l) => l.trimEnd());

        const header = (lines[0] || '').trim();

        const frames = lines

            .slice(1)

            .map((l) => l.trim())

            .filter(Boolean)

            .filter((l) => l.startsWith('at ') || l.startsWith('at\t') || l.startsWith('at\u00A0') || l.startsWith('at'))

            .filter((l) => !/\(native\)\s*$/.test(l) && !/^at\s+forEach\s+\(native\)\s*$/.test(l));



        const kept = frames.slice(0, MAX_FRAMES);

        const trimmed = Math.max(0, frames.length - kept.length);



        const out = [header, ...kept.map((f) => (f.startsWith('at ') ? `  ${f}` : `  at ${f}`))];

        if (trimmed > 0) out.push(`  ... (trimmed ${trimmed} frame${trimmed === 1 ? '' : 's'})`);

        return out.join('\n').trim();

    }



    // Stack một dòng: dòng `ReferenceError: ... at ... at ...`. 

    const idx = text.indexOf(' at ');

    if (idx === -1) return raw;



    const header = text.slice(0, idx).trim();

    const framesPart = text.slice(idx + 4);

    const frames = framesPart

        .split(/\s+at\s+/g)

        .map((s) => s.trim())

        .filter(Boolean)

        .filter((f) => !/\(native\)\s*$/.test(f) && !/^forEach\s+\(native\)\s*$/.test(f));



    const kept = frames.slice(0, MAX_FRAMES);

    const trimmed = Math.max(0, frames.length - kept.length);



    const out = [header, ...kept.map((f) => `  at ${f}`)];

    if (trimmed > 0) out.push(`  ... (trimmed ${trimmed} frame${trimmed === 1 ? '' : 's'})`);

    return out.join('\n').trim();

}



