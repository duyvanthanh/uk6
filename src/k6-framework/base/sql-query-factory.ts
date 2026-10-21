import { SqlQueryModel } from "./sql-query-model.js";



export type CreateSqlQueryArgs = {

  /** Handle DB của `k6/x/sql` (từ `sql.open(...)`). */

  db: any;

  /** Query mặc định (có thể override theo từng lần gọi). */

  query: string | ((options: any) => string);

  /** Params mặc định (có thể override theo từng lần gọi). */

  params?: any[] | ((options: any) => any[]);

  /** Timeout mặc định (có thể override theo từng lần gọi). */

  timeout?: string | null | ((options: any) => string | null);

  /** Tên hiển thị trong tag/log (tuỳ chọn). */

  name?: string | ((options: any) => string);

  /** Base tags (tuỳ chọn). */

  baseTags?: Record<string, string>;

  /**

   * Mã trả về khi SELECT/WITH không có bản ghi.

   * Mặc định: `100` (SQLSTATE "no data").

   */

  noRowsCode?: number | ((options: any) => number);

  /** Với SELECT/WITH: log số dòng trả về. */

  logRowCount?: boolean | ((options: any) => boolean);

  /** Log payload raw trả về từ driver. */

  logPayload?: boolean | ((options: any) => boolean);

  /** Với SELECT/WITH: log dòng đầu tiên (nếu có). */

  logFirstRow?: boolean | ((options: any) => boolean);

  /** Giới hạn độ dài log (ký tự). Mặc định: 2000. */

  maxLogLength?: number | ((options: any) => number);

};



/**

 * Tạo factory SQL query trả về {@link SqlQueryModel} để dùng trong `Flow.executeStep()`.

 *

 * Mục đích:

 * - Định nghĩa query tái sử dụng (db/query/params/timeout/tags...).

 * - Override theo từng lần gọi tương tự cách dùng `createEndpoint(...)`.

 * - Dùng cùng interface step (qua `createDbStep({ query: ... })`).

 *

 * Ví dụ:

 * ```js

 * import sql from "k6/x/sql";

 * import oracle from "k6/x/sql/driver/oracle";

 * import { createOracleDsn, createSqlQuery, createDbStep, createScenario, setups, flow, assertStatus } from "uk6/k6-framework";

 *

 * const dsn = createOracleDsn({ user, password, host, port, service });

 * const db = sql.open(oracle, dsn);

 *

 * const selectHealth = createSqlQuery({

 *   db,

 *   name: "db health",

 *   query: "SELECT 1 AS OK FROM dual",

 *   timeout: "5s",

 *   logFirstRow: true,

 * });

 *

 * const { setup, runScenario } = createScenario({

 *   flowName: "DB demo",

 *   plan: [

 *     setups([createDbStep({ name: "health", query: selectHealth, checks: [assertStatus(0)] })]),

 *     flow([]),

 *   ],

 * });

 * export { setup, runScenario };

 * ```

 */

export function createSqlQuery(args: CreateSqlQueryArgs) {

  const { db, query, params, timeout, name, baseTags, noRowsCode, logRowCount, logPayload, logFirstRow, maxLogLength } =

    args || ({} as any);

  if (!db) throw new Error('createSqlQuery: "db" is required');

  if (!query) throw new Error('createSqlQuery: "query" is required');



  return function sqlQueryFactory(options: any = {}) {

    const resolvedQuery = typeof query === "function" ? query(options) : query;

    const resolvedParams = typeof params === "function" ? params(options) : params;

    const resolvedTimeout = typeof timeout === "function" ? timeout(options) : timeout;

    const resolvedName = typeof name === "function" ? name(options) : name;

    const resolvedNoRowsCode = typeof noRowsCode === "function" ? noRowsCode(options) : noRowsCode;

    const resolvedLogRowCount = typeof logRowCount === "function" ? logRowCount(options) : logRowCount;

    const resolvedLogPayload = typeof logPayload === "function" ? logPayload(options) : logPayload;

    const resolvedLogFirstRow = typeof logFirstRow === "function" ? logFirstRow(options) : logFirstRow;

    const resolvedMaxLogLength = typeof maxLogLength === "function" ? maxLogLength(options) : maxLogLength;



    const paramOverrides = options.params;

    const timeoutOverride = options.timeout;

    const nameOverride = options.name;

    const tagOverrides = options.tags || {};

    const dbOverride = options.db;



    return new SqlQueryModel({

      db: dbOverride || db,

      query: options.query || resolvedQuery,

      params: Array.isArray(paramOverrides) ? paramOverrides : Array.isArray(resolvedParams) ? resolvedParams : [],

      timeout:

        typeof timeoutOverride !== "undefined"

          ? timeoutOverride

          : typeof resolvedTimeout !== "undefined"

            ? resolvedTimeout

            : null,

      name: nameOverride || resolvedName,

      tags: { ...(baseTags || {}), ...(tagOverrides || {}) },

      noRowsCode: Number.isFinite(options.noRowsCode) ? options.noRowsCode : resolvedNoRowsCode,

      logRowCount: typeof options.logRowCount !== "undefined" ? options.logRowCount : resolvedLogRowCount,

      logPayload: typeof options.logPayload !== "undefined" ? options.logPayload : resolvedLogPayload,

      logFirstRow: typeof options.logFirstRow !== "undefined" ? options.logFirstRow : resolvedLogFirstRow,

      maxLogLength: Number.isFinite(options.maxLogLength) ? options.maxLogLength : resolvedMaxLogLength,

    });

  };

}



/**

 * Alias tương thích ngược.

 * @deprecated Dùng {@link createSqlQuery}.

 */

export function createSql(args: any) {

  return createSqlQuery(args);

}



