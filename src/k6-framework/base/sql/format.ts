import { toLogString } from "./logging.js";

import type { NormalizedSqlInput } from "./normalize.js";



export function formatSqlSuccess(input: NormalizedSqlInput, raw: any) {

  const duration = Date.now() - input.started;

  const rows = input.select ? (Array.isArray(raw) ? raw : raw?.rows ?? []) : null;

  const rowCount = input.select ? (Array.isArray(rows) ? rows.length : 0) : null;

  const status = input.select && rowCount === 0 ? input.noRowsCode : 0;



  if (input.select) {

    if (input.logRowCount) console.log(`Row count: ${rowCount}`);

    if (input.logPayload) console.log(`Raw payload: ${toLogString(raw, input.maxLogLength)}`);

    if (input.logFirstRow && rowCount && rowCount > 0) console.log(`First row: ${toLogString((rows as any)[0], input.maxLogLength)}`);

  } else {

    if (input.logPayload) console.log(`Exec result: ${toLogString(raw, input.maxLogLength)}`);

  }



  const payload = {

    ok: true,

    protocol: "sql",

    sqlCode: status,

    query: input.query,

    rowCount,

    rows,

    result: input.select ? null : raw,

  };



  return {

    status,

    headers: {},

    timings: { duration },

    body: JSON.stringify(payload),

    sql: { raw },

  };

}



export function formatSqlError(input: NormalizedSqlInput, err: any) {

  const duration = Date.now() - input.started;

  const nativeCodeRaw = err?.code ?? err?.errorCode ?? err?.errno ?? err?.number ?? err?.sqlcode;

  const nativeCode = Number.isFinite(nativeCodeRaw) ? Number(nativeCodeRaw) : null;

  const status = nativeCode != null ? nativeCode : -1;

  const payload = {

    ok: false,

    protocol: "sql",

    sqlCode: status,

    query: input.query,

    error: {

      name: err?.name || "Error",

      message: err?.message || String(err),

      code: nativeCode,

    },

  };



  const body = toLogString(JSON.stringify(payload), input.maxLogLength);



  return {

    status,

    headers: {},

    timings: { duration },

    body,

    error: err,

  };

}



