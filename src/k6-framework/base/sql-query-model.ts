export type SqlQueryModelConfig = {

  /** Handle DB của `k6/x/sql` (từ `sql.open(...)`). */

  db: any;

  /** Chuỗi SQL query. */

  query: string;

  /**  Params positional truyền cho driver (vd: `...params`). */

  params?: any[];

  /** Timeout theo format driver hỗ trợ (vd: `"5s"`, `"5000ms"`...). */

  timeout?: string | null;

  /** Tên hiển thị trong tag/log (tuỳ chọn). */

  name?: string;

  /** Tags (tuỳ chọn) để correlate log/metrics. */

  tags?: Record<string, string>;

  /**

   * Mã trả về khi SELECT/WITH không có bản ghi.

   * Mặc định: `100` (SQLSTATE "no data").

   *

   * Với Oracle, nếu bạn muốn mapping về 1403 thì có thể set `noRowsCode: 1403`.

   */

  noRowsCode?: number;



  /** Với SELECT/WITH: log số dòng trả về. */

  logRowCount?: boolean;

  /** Log payload raw trả về từ driver. */

  logPayload?: boolean;

  /** Với SELECT/WITH: log dòng đầu tiên (nếu có). */

  logFirstRow?: boolean;

  /** Giới hạn độ dài log (ký tự). Mặc định: 2000. */

  maxLogLength?: number;

};



function normalizeQuery(query: unknown) {

  return String(query || "").trim();

}



/**

 * Model query cho step SQL dùng chung interface với `Flow`:

 * - `getUrl()`/`getRequestConfig()` để `Flow` log request/response theo cùng schema

 * - `protocol: "sql"` để `Flow.executeStep()` dispatch sang executor SQL

 *

 * Lưu ý về `status`:

 * - `0`  : thành công

 * - `100`: không có bản ghi (mặc định, cấu hình qua `noRowsCode`)

 * - khác : error code native (nếu driver trả về được)

 */

export class SqlQueryModel {

  protocol: "sql";

  method: "SQL";

  db: any;

  query: string;

  params: any[];

  timeout: string | null;

  tags: Record<string, string>;

  name: string;

  noRowsCode: number;

  logRowCount: boolean;

  logPayload: boolean;

  logFirstRow: boolean;

  maxLogLength: number;



  constructor(config: SqlQueryModelConfig) {

    if (!config || !config.db) throw new Error('SqlQueryModel: "db" is required');

    const q = normalizeQuery(config.query);

    if (!q) throw new Error('SqlQueryModel: "query" is required');



    this.protocol = "sql";

    this.method = "SQL";

    this.db = config.db;

    this.query = q;

    this.params = Array.isArray(config.params) ? config.params : [];

    this.timeout = typeof config.timeout === "string" && config.timeout.trim() ? config.timeout.trim() : null;

    this.tags = config.tags || {};

    this.name = config.name || "SQL";

    this.noRowsCode = Number.isFinite(config.noRowsCode as any) ? Number(config.noRowsCode) : 100;

    this.logRowCount = Boolean(config.logRowCount);

    this.logPayload = Boolean(config.logPayload);

    this.logFirstRow = Boolean(config.logFirstRow);

    this.maxLogLength = Number.isFinite(config.maxLogLength as any) ? Number(config.maxLogLength) : 2000;

  }



  getUrl(): string {

    return "sql://";

  }



  getRequestConfig(): any {

    return {

      timeout: this.timeout,

      tags: {

        name: this.name,

        endpoint: "sql",

        method: "SQL",

        service: __ENV.SERVICE_NAME || "db-under-test",

        environment: __ENV.TEST_ENV || "local",

        ...this.tags,

      },

      sql: {

        query: this.query,

        params: this.params,

        timeout: this.timeout,

        noRowsCode: this.noRowsCode,

        logRowCount: this.logRowCount,

        logPayload: this.logPayload,

        logFirstRow: this.logFirstRow,

        maxLogLength: this.maxLogLength,

      },

    };

  }

}



