import { executeSql } from "./sql/execute.js";

import { formatSqlError, formatSqlSuccess } from "./sql/format.js";

import { normalizeSqlInput } from "./sql/normalize.js";

import type { StepResponse } from "./transport/response.js";



/**

 * @internal Thực thi SQL query và trả về object “giống response” để Flow/Scenario xử lý thống nhất.

 *

 * Quy ước `status`:

 * - `0`: thành công

 * - `noRowsCode` (mặc định `100`): SELECT/WITH không có bản ghi

 * - lỗi: cố gắng lấy error code native từ driver (vd: `err.code`, `err.errorCode`...), nếu không có thì `-1`

 *

 * `body` luôn là JSON string để các helper hiện có (extractors/assertPath/parseJsonSafe) dùng lại được.

 */

export function sqlRequest(endpoint: any, config: any) {

  const input = normalizeSqlInput(endpoint, config);

  try {

    const raw = executeSql(input);

    return formatSqlSuccess(input, raw) as StepResponse;

  } catch (err: any) {

    return formatSqlError(input, err) as StepResponse;

  }

}

