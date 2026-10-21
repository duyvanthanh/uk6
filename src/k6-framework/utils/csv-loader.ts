import { SharedArray } from "k6/data";

import exec from "k6/execution";



/**

 * CSV helpers cho k6:

 * - `SharedArray` để load file 1 lần, dùng chung giữa các VU (giảm I/O).

 * - picker giữ cursor per‑VU (state nằm trong runtime của VU).

 */

export type LoadCsvOptions = {

  separator?: string;

  trim?: boolean;

  name?: string;

  limit?: number;

};



/**

 * Load file CSV qua k6 `open()` đúng 1 lần (dùng chung cho các VU) bằng `SharedArray`

 *

 * `path` nên là đường dẫn mà k6 có thể `open()`; trong project đã bundle thường bắt đầu bằng `/tests/...`

 *

 * Ví dụ:

 * ```js

 * import { createCsvDriver, createCsvPicker } from "uk6/k6-framework";

 *

 * // File CSV có header: username,password

 * const driver = createCsvDriver("/tests/performance/data/users.csv", { ctxKey: "user" });

 * const pickUser = createCsvPicker(driver, { mode: "global" });

 *

 * export default function () {

 *   const ctx = {};

 *   const user = pickUser(ctx); // đồng thời set ctx.user

 *   // dùng user.username / user.password ...

 * }

 * ```

 *

 * @param path Đường dẫn file CSV.

 * @param options Tuỳ chọn parse CSV.

 * @returns `SharedArray` chứa các record (object theo header).

 */

export function loadCsv(path: string, { separator = ",", trim = true, name, limit }: LoadCsvOptions = {}) {

  return new SharedArray(name || `csv:${path}`, () => parseCsv(open(path), { separator, trim, limit }));

}



/**

 * Tạo picker round-robin đơn giản trên một danh sách.

 *

 * Trong k6, mỗi VU có runtime JS riêng, nên hàm này giữ 1 cursor cho mỗi VU.

 *

 * @param items Danh sách item.

 * @returns Hàm `() => item | null`.

 */

export function createRoundRobinPicker<T>(items: T[] = []) {

  let index = 0;

  const count = items.length;



  return () => {

    if (count === 0) return null;

    const value = items[index % count];

    index = (index + 1) % count;

    return value;

  };

}



export type CreateCsvDriverOptions = LoadCsvOptions & { ctxKey?: string };



/**

 * Helper tiện lợi: load CSV và trả về:

 * - `rows`: mảng record dùng chung

 * - `next()`: picker round-robin

 * - `withRecord(fn)`: bọc handler `(record, ctx)` và ghi `ctx[ctxKey]`

 *

 * @param path Đường dẫn CSV.

 * @param options Tuỳ chọn load + `ctxKey`.

 * @returns Driver `{ rows, next, withRecord, ctxKey }`.

 */

export function createCsvDriver(

  path: string,

  { ctxKey = "csvRecord", separator = ",", trim = true, name, limit }: CreateCsvDriverOptions = {},

) {

  const rows = loadCsv(path, { separator, trim, name, limit });

  const next = createRoundRobinPicker(rows as any[]);



  const withRecord = (handler: any) => (ctx: any = {}) => {

    const record = next();

    if (ctx) ctx[ctxKey] = record;

    return handler(record, ctx);

  };



  return { rows, next, withRecord, ctxKey };

}



export type CreateCsvPickerOptions = {

  mode?: "per_vu" | "global" | "fixed_vu" | "split" | "split_by_max_vus";

  vuCount?: number;

  splitVUs?: number;

  maxVUs?: number;

  envVuCountKey?: string;

  envMaxVUsKey?: string;

};



/**

 * Tạo CSV record picker với các chế độ phân phối:

 *

 * - `per_vu` (mặc định): mỗi VU tự round-robin độc lập

 * - `global`: phân phối legacy theo `(__VU, __ITER)`; không đảm bảo global uniqueness

 * - `fixed_vu`: mỗi VU luôn giữ cố định một row theo số thứ tự VU

 * - `split`: chia row theo tổng số VU cố định và gán mỗi VU một tập con ổn định

 * - `split_by_max_vus`: chia slot theo max VUs cố định; phù hợp hơn cho `ramping-vus`

 *

 * Với `split`, truyền `vuCount` (hoặc set env `CSV_SPLIT_VUS` / `VU_COUNT` ...).

 * Với `split_by_max_vus`, nên truyền `maxVUs` hoặc set env `CSV_MAX_VUS`.

 *

 * Gợi ý chọn mode:

 * - `fixed_vu`: an toàn khi muốn VU nào cũng giữ 1 row ổn định

 * - `split_by_max_vus`: nên dùng cho `ramping-vus` / `constant-vus` nếu cần mỗi VU đi theo slot riêng

 * - `global`: chỉ nên xem là mode legacy deterministic mix, không phải allocator global thật

 *

 * @param driver Kết quả từ {@link createCsvDriver}.

 * @param options Cấu hình chế độ phân phối record.

 * @returns Hàm picker `(ctx) => record | null` (tự ghi `ctx[ctxKey]` nếu có ctx).

 */

export function createCsvPicker(

  driver: any,

  {

    mode = "per_vu",

    vuCount,

    splitVUs,

    maxVUs,

    envVuCountKey = "CSV_SPLIT_VUS",

    envMaxVUsKey = "CSV_MAX_VUS",

  }: CreateCsvPickerOptions = {},

) {

  const { rows, next, ctxKey = "csvRecord" } = driver || {};

  const normalizedMode = String(mode || "per_vu").toLowerCase();

  const totalRows = Array.isArray(rows) ? rows.length : 0;

  const warned = new Set<string>();



  function toPositiveInt(value: any) {

    const parsed = typeof value === "number" ? value : typeof value === "string" ? parseInt(value, 10) : NaN;

    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;

  }



  function getExecutionInfo() {

    const scenario = exec && (exec as any).scenario && typeof (exec as any).scenario === "object" ? (exec as any).scenario : null;

    const instance = exec && (exec as any).instance && typeof (exec as any).instance === "object" ? (exec as any).instance : null;

    return {

      executor: scenario && typeof scenario.executor === "string" ? scenario.executor : null,

      vuId: Math.max(1, typeof __VU === "number" && Number.isFinite(__VU) ? __VU : 1),

      iter: Math.max(0, typeof __ITER === "number" && Number.isFinite(__ITER) ? __ITER : 0),

      scenarioVUs: toPositiveInt(scenario && (scenario as any).vus),

      scenarioVUsMax: toPositiveInt(

        scenario && ((scenario as any).vusMax ?? (scenario as any).maxVUs ?? (scenario as any).preAllocatedVUs),

      ),

      instanceVUsInitialized: toPositiveInt(instance && (instance as any).vusInitialized),

      instanceVUsActive: toPositiveInt(instance && (instance as any).vusActive),

    };

  }



  function warnOnce(key: string, message: string) {

    if (warned.has(key)) return;

    warned.add(key);

    console.warn(`[uk6][csv-picker] ${message}`);

  }



  function isDynamicExecutor(executor: string | null) {

    return executor === "ramping-vus" || executor === "constant-arrival-rate" || executor === "ramping-arrival-rate";

  }



  function resolveVuCount() {

    const direct = typeof vuCount === "number" ? vuCount : typeof splitVUs === "number" ? splitVUs : null;



    const directInt = toPositiveInt(direct);

    if (directInt) return directInt;



    if (typeof __ENV !== "undefined") {

      const keysToTry: string[] = [];

      if (envVuCountKey && typeof envVuCountKey === "string") keysToTry.push(envVuCountKey);

      keysToTry.push("CSV_SPLIT_VUS", "CSV_VU_COUNT", "VU_COUNT", "VUS");



      for (const key of keysToTry) {

        const parsed = toPositiveInt(__ENV[key]);

        if (parsed) return parsed;

      }

    }



    return null;

  }



  function resolveMaxVuSlots(execution: ReturnType<typeof getExecutionInfo>) {

    const direct = toPositiveInt(maxVUs);

    if (direct) return direct;



    if (typeof __ENV !== "undefined") {

      const keysToTry: string[] = [];

      if (envMaxVUsKey && typeof envMaxVUsKey === "string") keysToTry.push(envMaxVUsKey);

      keysToTry.push("CSV_MAX_VUS", "K6_MAX_VUS", "MAX_VUS");



      for (const key of keysToTry) {

        const parsed = toPositiveInt(__ENV[key]);

        if (parsed) return parsed;

      }

    }



    return (

      execution.scenarioVUsMax ||

      execution.scenarioVUs ||

      execution.instanceVUsInitialized ||

      execution.instanceVUsActive ||

      toPositiveInt(splitVUs) ||

      toPositiveInt(vuCount)

    );

  }



  function pickSplitRecord() {

    if (!totalRows) return null;

    const execution = getExecutionInfo();

    if (isDynamicExecutor(execution.executor) && !toPositiveInt(vuCount) && !toPositiveInt(splitVUs)) {

      warnOnce(

        `split:${execution.executor || "unknown"}`,

        `mode="split" expects a stable total VU count. Executor "${execution.executor || "unknown"}" may start VUs later; prefer mode="split_by_max_vus".`,

      );

    }



    const resolvedVuCount = resolveVuCount();

    if (!resolvedVuCount || resolvedVuCount <= 0) {

      const idx = (((execution.vuId - 1 + execution.iter) % totalRows) + totalRows) % totalRows;

      return rows[idx];

    }



    const totalVus = resolvedVuCount;

    const vuZeroBased = Math.max(0, execution.vuId - 1);

    const slot = vuZeroBased % totalVus;



    if (slot >= totalRows) {

      const idx = (((execution.vuId - 1 + execution.iter) % totalRows) + totalRows) % totalRows;

      return rows[idx];

    }



    const assignedCount = Math.ceil((totalRows - slot) / totalVus);

    if (assignedCount <= 0) {

      const idx = (((execution.vuId - 1 + execution.iter) % totalRows) + totalRows) % totalRows;

      return rows[idx];

    }



    const posInAssigned = execution.iter % assignedCount;

    const recordIndex = slot + posInAssigned * totalVus;



    return rows[recordIndex];

  }



  function pickFixedVuRecord() {

    if (!totalRows) return null;



    const execution = getExecutionInfo();

    const vuOffset = Math.max(0, execution.vuId - 1);

    const idx = (vuOffset % totalRows + totalRows) % totalRows;

    return rows[idx];

  }



  function pickSplitByMaxVusRecord() {

    if (!totalRows) return null;



    const execution = getExecutionInfo();

    const slotCount = resolveMaxVuSlots(execution);

    if (!slotCount || slotCount <= 0) {

      throw new Error(

        `mode="split_by_max_vus" requires a stable max VU count. Provide options.maxVUs or set ${envMaxVUsKey}.`,

      );

    }



    const slot = ((Math.max(0, execution.vuId - 1) % slotCount) + slotCount) % slotCount;

    const recordIndex = slot + execution.iter * slotCount;

    return rows[((recordIndex % totalRows) + totalRows) % totalRows];

  }



  return (ctx: any = {}) => {

    if (!rows?.length) return null;



    let record: any;

    if (normalizedMode === "global") {

      const execution = getExecutionInfo();

      if (isDynamicExecutor(execution.executor)) {

        warnOnce(

          `global:${execution.executor || "unknown"}`,

          `mode="global" is legacy (__VU + __ITER) mapping and is not globally unique for executor "${execution.executor || "unknown"}". Use "split_by_max_vus" or an external allocator if uniqueness matters.`,

        );

      }

      record = rows[((execution.vuId - 1 + execution.iter) % rows.length)];

    } else if (normalizedMode === "fixed_vu") {

      record = pickFixedVuRecord();

    } else if (normalizedMode === "split_by_max_vus") {

      record = pickSplitByMaxVusRecord();

    } else if (normalizedMode === "split") {

      record = pickSplitRecord();

    } else {

      record = next();

    }



    if (ctx) ctx[ctxKey] = record;

    return record;

  };

}



function parseCsv(text: string, { separator = ",", trim = true, limit }: LoadCsvOptions = {}) {

  if (!text) return [];

  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) return [];



  const isWhitespaceSeparator = separator === " " || separator === "\t";

  const splitter: any = isWhitespaceSeparator ? /\s+/ : separator;



  const headers = lines[0].split(splitter).map((h) => (trim ? h.trim() : h));

  const dataLines = typeof limit === "number" && limit > 0 ? lines.slice(1, 1 + limit) : lines.slice(1);



  return dataLines.map((line) => {

    const parts = line.split(splitter);

    const record: Record<string, string> = {};

    headers.forEach((header, idx) => {

      const value = parts[idx] !== undefined ? parts[idx] : "";

      record[header] = trim ? value.trim() : value;

    });

    return record;

  });

}

