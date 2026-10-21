export type OracleDsnQueryParams = Record<string, string | number | boolean | null | undefined>;



export type OracleDsnOptions = {

  /** Username đăng nhập DB. */

  user: string;

  /** Password đăng nhập DB. */

  password: string;

  /** Host DB (ip/hostname). */

  host: string;

  /** Port DB. */

  port: string | number;

  /** Service name (vd: `ORCL`). Có thể truyền kèm `/ORCL`, hàm sẽ tự normalize. */

  service: string;

  /** Querystring params (tuỳ driver hỗ trợ). */

  params?: OracleDsnQueryParams;

};



function normalizeService(service: unknown) {

  const s = String(service || "").trim();

  if (!s) return "";

  return s.startsWith("/") ? s.slice(1) : s;

}



function toQueryString(params: OracleDsnQueryParams | undefined) {

  if (!params) return "";

  const parts: string[] = [];

  Object.entries(params).forEach(([k, v]) => {

    if (v === undefined || v === null) return;

    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);

  });

  return parts.length ? `?${parts.join("&")}` : "";

}



/**

 * Tạo DSN Oracle cho `k6/x/sql` (driver oracle).

 *

 * Format cơ bản:

 * `oracle://<user>:<password>@<host>:<port>/<service>`

 *

 * Gợi ý dùng:

 * - Dùng cho các script DB test để tránh phải tự nối string thủ công. Nếu tự nối string thủ công sẽ phải tự encode ký tự đặc biệt.

 * - Có thể truyền thêm `params` để build querystring (vd: `{ ssl: true }`).

 *

 * Ví dụ:

 * ```js

 * import { createOracleDsn } from "uk6/k6-framework";

 *

 * const dsn = createOracleDsn({

 *   user: __ENV.DB_USER,

 *   password: __ENV.DB_PASSWORD,

 *   host: __ENV.DB_HOST,

 *   port: __ENV.DB_PORT,

 *   service: __ENV.DB_SERVICE,

 * });

 * ```

 *

 * @param options Thông tin kết nối để build DSN.

 */

export function createOracleDsn(options: OracleDsnOptions) {

  if (!options) {

    throw new Error("createOracleDsn: options is required");

  }



  const user = String(options.user ?? "");

  const password = String(options.password ?? "");

  const host = String(options.host ?? "");

  const port = String(options.port ?? "");

  const service = normalizeService(options.service);



  if (!user) throw new Error('createOracleDsn: "user" is required');

  if (!password) throw new Error('createOracleDsn: "password" is required');

  if (!host) throw new Error('createOracleDsn: "host" is required');

  if (!port) throw new Error('createOracleDsn: "port" is required');

  if (!service) throw new Error('createOracleDsn: "service" is required');



  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;

  const queryString = toQueryString(options.params);

  return `oracle://${auth}@${host}:${port}/${service}${queryString}`;

}

