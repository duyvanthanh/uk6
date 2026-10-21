import { isSelectQuery } from "./detect.js";



export type NormalizedSqlInput = {

  started: number;

  query: string;

  params: any[];

  timeout: string | null;

  select: boolean;

  db: any;

  logRowCount: boolean;

  logPayload: boolean;

  logFirstRow: boolean;

  maxLogLength: number;

  noRowsCode: number;

};



export function normalizeSqlInput(endpoint: any, config: any): NormalizedSqlInput {

  const started = Date.now();

  const query = String(endpoint?.query || config?.sql?.query || "").trim();

  const params = Array.isArray(endpoint?.params) ? endpoint.params : Array.isArray(config?.sql?.params) ? config.sql.params : [];

  const timeout: string | null =

    typeof endpoint?.timeout === "string" && endpoint.timeout.trim()

      ? endpoint.timeout.trim()

      : typeof config?.timeout === "string" && config.timeout.trim()

        ? config.timeout.trim()

        : null;



  const db = endpoint?.db;

  if (!db || typeof db.query !== "function" || typeof db.exec !== "function") {

    throw new Error("sqlRequest: db handle không hợp lệ (cần db của k6/x/sql có query/exec)");

  }

  if (!query) throw new Error('sqlRequest: thiếu "query"');



  const select = isSelectQuery(query);

  const logRowCount = Boolean(endpoint?.logRowCount ?? config?.sql?.logRowCount);

  const logPayload = Boolean(endpoint?.logPayload ?? config?.sql?.logPayload);

  const logFirstRow = Boolean(endpoint?.logFirstRow ?? config?.sql?.logFirstRow);

  const maxLogLength =

    Number.isFinite(endpoint?.maxLogLength)

      ? Number(endpoint.maxLogLength)

      : Number.isFinite(config?.sql?.maxLogLength)

        ? Number(config.sql.maxLogLength)

        : 2000;



  const noRowsCode =

    Number.isFinite(endpoint?.noRowsCode)

      ? Number(endpoint.noRowsCode)

      : Number.isFinite(config?.sql?.noRowsCode)

        ? Number(config.sql.noRowsCode)

        : 100;



  return {

    started,

    query,

    params,

    timeout,

    select,

    db,

    logRowCount,

    logPayload,

    logFirstRow,

    maxLogLength,

    noRowsCode,

  };

}



