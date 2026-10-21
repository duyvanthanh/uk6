/**

 * Khung k6 (k6 Framework) của `uk6`.

 *

 * Mục tiêu của framework này không phải “giấu hết k6”, mà là chuẩn hoá cách viết test để:

 * - cùng một kiểu mô hình hoá endpoint (đỡ copy/paste URL, header, query param…)

 * - cùng một cách điều phối step (log/trace nhất quán, dễ debug khi fail ở giữa luồng)

 * - cùng một cách ghép `setup()` + main scenario + `teardown()` (giảm lỗi placement/điều kiện chạy)

 * - tái sử dụng test data (CSV, generator) theo cách phù hợp runtime tách biệt của k6 (mỗi VU là 1 JS runtime)

 *

 * Các khối chính:

 * - Endpoint model / factory: `createEndpoint`, `EndpointModel`

 * - Điều phối luồng: `Flow`

 * - Điều phối scenario: `createScenario`, `setups`, `flow`, `concurrent`, `teardowns`

 * - CSV/test data: `loadCsv`, `createCsvDriver`, `createCsvPicker`

 * - Helper response/check/extractors: `assertStatus`, `assertPath`, `extractValues`, ...

 *

 * Cách dùng thường gặp:

 * ```js

 * import { createScenario, createStep, assertStatus } from "uk6/k6-framework";

 * ```

 */

export * from "./base/index.js";

export * from "./utils/index.js";



