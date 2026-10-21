import { parseMsg } from "./parseMsg.js";

import { asNumber } from "../utils/number.js";



/** @internal Chuẩn hoá 1 log entry thành cấu trúc “API call attempt” để aggregate/report. */

export function toApiCall(entry: any) {

    const msg = parseMsg(entry);

    const t = msg && typeof msg.type === 'string' ? msg.type : null;

    const allowed = new Set([

        'flow_step_call',

        'flow_step_error',

        'concurrent_step_call',

        'concurrent_step_error',

        'setup_call',

        'setup_error',

        'teardown_call',

        'teardown_error'

    ]);

    if (!msg || !t || !allowed.has(t)) return null;



    const response = msg.response && typeof msg.response === 'object' ? msg.response : {};

    const timings = response.timings && typeof response.timings === 'object' ? response.timings : {};

    const tags = msg.tags && typeof msg.tags === 'object' ? msg.tags : {};

    const checks = msg.checks && typeof msg.checks === 'object' ? msg.checks : {};



    const stepName = msg.stepName || tags.name || 'unknown-step';

    const method = msg.method || tags.method || 'UNKNOWN';

    const endpoint = tags.endpoint || msg.url || stepName;



    const fullUrl = msg.url || (response && typeof (response as any).request_url === "string" ? (response as any).request_url : null);

    const remoteIp = response && typeof (response as any).remote_ip === "string" ? (response as any).remote_ip : null;

    const remotePort = asNumber(response && (response as any).remote_port);

    const remoteAddress = remoteIp && remotePort != null ? `${remoteIp}:${remotePort}` : remoteIp || null;

    const status = asNumber(response.status) ?? asNumber(msg.status) ?? 0;

    const duration = asNumber(timings.duration);

    const timestamp = Date.parse(entry.time);

    const checkValues = Object.values(checks);

    const hasAnyCheck = checkValues.length > 0;

    const hasFailedCheck = checkValues.some((v) => v === false);



    const isSql =

        String(method || '')

            .toUpperCase()

            .trim() === 'SQL' ||

        tags.endpoint === 'sql' ||

        (msg.request && typeof msg.request === 'object' && msg.request.sql);



    const isError =

        t === 'flow_step_error' ||

        t === 'concurrent_step_error' ||

        t === 'setup_error' ||

        t === 'teardown_error' ||

        entry.level === 'error' ||

        hasFailedCheck ||

        (isSql ? status !== 0 : status < 200 || status >= 300);

    const requestBody =

        (msg.request && typeof msg.request === 'object' && msg.request.body && typeof msg.request.body === 'object'

            ? msg.request.body

            : null) ||

        (msg.requestBody && typeof msg.requestBody === 'object' ? msg.requestBody : null) ||

        {};

    const attemptKey = [

        method,

        endpoint,

        String(msg.stepIndex ?? ''),

        String(status),

        String(entry.time || ''),

        String(requestBody.refNo ?? ''),

        String(requestBody.transactionId ?? ''),

        String(requestBody.requestId ?? ''),

        String(requestBody.orderCode ?? '')

    ].join('|');



    return {

        key: `${method} ${endpoint}`,

        rawType: t,

        attemptKey,

        stepName,

        method,

        endpoint,

        url: fullUrl,

        remoteIp,

        remotePort,

        remoteAddress,

        status,

        duration,

        timestamp: Number.isFinite(timestamp) ? timestamp : null,

        isError,

        checkPassed: hasAnyCheck ? !hasFailedCheck : null

    };

}

