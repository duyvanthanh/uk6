import { parseJsonSafe as parseJsonSafeCore, pickFirst as pickFirstCore } from "../../core/response.js";



/**

 * Helpers xử lý response (parse JSON, pick dot-path, checks builders).

 */



/**

 * Parse JSON an toàn từ body dạng string.

 *

 * @param body `response.body` hoặc chuỗi JSON.

 * @returns Object đã parse hoặc `null`.

 */

export function parseJsonSafe(body: unknown): any | null {

  if (typeof body !== "string") return null;

  return parseJsonSafeCore(body);

}



/**

 * Lấy giá trị khác `null`/`undefined` đầu tiên từ danh sách dot-path.

 */

export function pickFirst(data: any, paths: string[] = []): any {

  return pickFirstCore(data, paths);

}



/**

 * Tạo extractors map cho Flow từ `{ ctxKey: pathOrPaths }`.

 * Mỗi key sẽ đọc từ `response.body` (JSON) theo dot-path và trả về để Flow ghi vào ctx.

 */

export function extractValues(pathMap: Record<string, string[] | string> = {}) {

  const extractors: Record<string, (response: any) => any> = {};

  Object.entries(pathMap).forEach(([key, paths]) => {

    extractors[key] = (response) => {

      const data = parseJsonSafe(response.body) || {};

      const candidates = Array.isArray(paths) ? paths : [paths];

      return pickFirst(data, candidates);

    };

  });

  return extractors;

}



/**

 * Tạo check config cho Flow/k6 để kiểm tra `response.status`.

 *

 * Hỗ trợ:

 * - `assertStatus(200)`

 * - `assertStatus("200")`

 */

export function assertStatus(expectedStatus: number | string, name?: string) {

  const normalizedStatus = Number(expectedStatus);

  const finalName = name || `status==${Number.isFinite(normalizedStatus) ? normalizedStatus : expectedStatus}`;

  return {

    name: finalName,

    condition: (res: any) => Number.isFinite(normalizedStatus) && Number(res?.status) === normalizedStatus,

  };

}



/**

 * Tạo check kiểm tra thời gian response (ms) dựa trên `response.timings.duration` của k6.

 *

 * Lưu ý: `duration` là tổng thời gian request (ms) theo k6.

 */

export function assertResponseTime(maxMs: number, name = `duration<=${maxMs}ms`) {

  return {

    name,

    condition: (res: any) => {

      const duration = Number(res?.timings?.duration);

      if (!Number.isFinite(duration)) return false;

      return duration <= Number(maxMs);

    },

  };

}



function dotWalk(root: any, dotPath: string) {

  const parts = String(dotPath || "").split(".").filter(Boolean);

  let current: any = root;



  for (const part of parts) {

    const isObjectLike = current !== null && (typeof current === "object" || typeof current === "function");

    if (!isObjectLike) return { found: false, value: undefined };

    if (!Object.prototype.hasOwnProperty.call(current, part)) return { found: false, value: undefined };

    current = current[part];

  }



  return { found: true, value: current };

}



function normalizeCandidates(path: string | string[]) {

  return Array.isArray(path) ? path : [path];

}



function getParsedData(res: any, data?: any) {

  return data && typeof data === "object" ? data : parseJsonSafe(res?.body) || {};

}



function getFirstTruthyValue(root: any, paths: string[]) {

  for (const p of paths) {

    const walked = dotWalk(root, p);

    if (walked.found && walked.value) return walked;

  }

  return { found: false, value: undefined };

}



function getFirstMatchingValue(root: any, paths: string[]) {

  for (const p of paths) {

    const walked = dotWalk(root, p);

    if (walked.found && walked.value !== undefined && walked.value !== null) return walked.value;

  }

  return undefined;

}



function isPrimitiveComparable(value: any) {

  return value === null || (typeof value !== "object" && typeof value !== "function");

}



function createStrictMatcher(expectedValues: any[]) {

  const primitiveValues: any[] = [];

  const complexValues: any[] = [];



  for (const value of expectedValues) {

    if (isPrimitiveComparable(value)) primitiveValues.push(value);

    else complexValues.push(value);

  }



  const primitiveSet = primitiveValues.length > 0 ? new Set(primitiveValues) : null;

  return (actual: any) => {

    if (primitiveSet && primitiveSet.has(actual)) return true;

    for (const value of complexValues) {

      if (actual === value) return true;

    }

    return false;

  };

}



function compileRegexList(patterns: string | string[]) {

  const items = Array.isArray(patterns) ? patterns : [patterns];

  return items.map((pattern) => ({ source: pattern, regex: new RegExp(pattern) }));

}



function formatRegexPatternList(compiledPatterns: Array<{ source: string }>) {

  if (compiledPatterns.length === 1) return `/${compiledPatterns[0].source}/`;

  return `[${compiledPatterns.map((item) => `/${item.source}/`).join(", ")}]`;

}



function normalizeHeaderRoot(headers: any) {

  if (!headers || typeof headers !== "object") return {};

  const normalized: Record<string, any> = {};

  Object.keys(headers).forEach((key) => {

    normalized[String(key).toLowerCase()] = headers[key];

  });

  return normalized;

}



function normalizeHeaderPath(path: string) {

  const parts = String(path || "").split(".").filter(Boolean);

  if (parts.length === 0) return "";

  parts[0] = parts[0].toLowerCase();

  return parts.join(".");

}



/**

 * Tạo check kiểm tra dot-path trong JSON body response.

 *

 * Hỗ trợ 2 cách dùng:

 * - `assertPath("result.code", "00")`: so sánh với giá trị mong đợi.

 * - `assertPath("result.code")`: chỉ kiểm tra path tồn tại và giá trị là truthy.

 *

 * Với `path` là mảng, helper sẽ thử lần lượt cho tới khi gặp path khớp.

 */

export function assertPath(path: string | string[], expectedValue: any, name?: string): { name: string; condition: (res: any, data?: any) => boolean };

export function assertPath(path: string | string[], expectedValues: any[], name?: string): { name: string; condition: (res: any, data?: any) => boolean };

export function assertPath(path: string | string[], name?: string): { name: string; condition: (res: any, data?: any) => boolean };

export function assertPath(path: string | string[], expectedValueOrName?: any, name?: string) {

  const candidates = normalizeCandidates(path);

  const existsMode = expectedValueOrName === undefined;

  const listMode = Array.isArray(expectedValueOrName);

  const expectedValue = existsMode || listMode ? undefined : expectedValueOrName;

  const expectedValues = listMode ? expectedValueOrName : undefined;

  const strictMatcher = expectedValues ? createStrictMatcher(expectedValues) : null;



  return {

    name:

      name ||

      (existsMode

        ? `exists(${candidates.join(" | ")})`

        : listMode

          ? `${candidates.join(" | ")} in ${JSON.stringify(expectedValues)}`

          : `${candidates.join(" | ")} === ${JSON.stringify(expectedValue)}`),

    condition: (res: any, data?: any) => {

      const parsed = getParsedData(res, data);

      if (existsMode) return getFirstTruthyValue(parsed, candidates).found;

      const value = getFirstMatchingValue(parsed, candidates);

      if (listMode) return value !== undefined && strictMatcher ? strictMatcher(value) : false;

      return value === expectedValue;

    },

  };

}



/**

 * Tạo check kiểm tra dot-path trong `response.headers`.

 *

 * Hỗ trợ 2 cách dùng:

 * - `assertHeader("content-type", "application/json")`: so sánh với giá trị mong đợi.

 * - `assertHeader("content-type")`: chỉ kiểm tra path tồn tại và giá trị là truthy.

 *

 * Key header được xử lý không phân biệt hoa thường.

 */

export function assertPathByRegex(

  path: string | string[],

  pattern: string,

  name?: string

): { name: string; condition: (res: any, data?: any) => boolean };

export function assertPathByRegex(

  path: string | string[],

  patterns: string[],

  name?: string

): { name: string; condition: (res: any, data?: any) => boolean };

export function assertPathByRegex(path: string | string[], patternOrPatterns: string | string[], name?: string) {

  const candidates = normalizeCandidates(path);

  const compiledPatterns = compileRegexList(patternOrPatterns);



  return {

    name: name || `regex(${candidates.join(" | ")}) ~= ${formatRegexPatternList(compiledPatterns)}`,

    condition: (res: any, data?: any) => {

      const parsed = getParsedData(res, data);

      const value = getFirstMatchingValue(parsed, candidates);

      if (value === undefined) return false;

      return compiledPatterns.some((item) => item.regex.test(String(value)));

    },

  };

}



export function assertHeader(path: string | string[], expectedValue: any, name?: string): { name: string; condition: (res: any) => boolean };

export function assertHeader(path: string | string[], name?: string): { name: string; condition: (res: any) => boolean };

export function assertHeader(path: string | string[], expectedValueOrName?: any, name?: string) {

  const candidates = normalizeCandidates(path).map((item) => normalizeHeaderPath(item));

  const existsMode = arguments.length === 1;

  const explicitName = name;

  const expectedValue = existsMode ? undefined : expectedValueOrName;



  return {

    name:

      explicitName ||

      (existsMode

        ? `header_exists(${candidates.join(" | ")})`

        : `header(${candidates.join(" | ")}) === ${JSON.stringify(expectedValue)}`),

    condition: (res: any) => {

      const headers = normalizeHeaderRoot(res?.headers);

      if (existsMode) return getFirstTruthyValue(headers, candidates).found;

      const value = getFirstMatchingValue(headers, candidates);

      return value === expectedValue;

    },

  };

}



/**

 * Parse JSON body và trả object.

 *

 * Khác `parseJsonSafe`: hàm này trả `{}` nếu parse fail để caller xử lý đơn giản hơn.

 */

export function parseBodyOrEmpty(body: unknown): any {

  const parsed = parseJsonSafe(body);

  return parsed == null ? {} : parsed;

}



/**

 * Tạo postprocessor để log các field được chọn từ JSON response body.

 *

 * Nếu không truyền `fields`, sẽ log toàn bộ body đã parse (nếu JSON) hoặc raw body.

 *

 * Ví dụ:

 * ```js

 * import { createStep, logFields } from "uk6/k6-framework";

 *

 * createStep({

 *   name: "getList",

 *   endpoint: getList,

 *   postprocessor: logFields({

 *     sessionId: ["sessionId", "result.sessionId"],

 *     responseCode: "result.responseCode",

 *   }),

 * });

 * ```

 *

 * @param fields Map `{ label: dotPath | dotPath[] }`.

 * @returns Postprocessor `(response, ctx) => void`.

 */

export function logFields(fields: Record<string, string[] | string> = {}) {

  return (response: any, _globalData: any) => {

    if (!fields || Object.keys(fields).length === 0) {

      const parsed = parseJsonSafe(response.body);

      const payload = parsed !== null ? parsed : response && "body" in response ? response.body : response;

      console.log("response:", payload);

    } else {

      logFieldsFromResponse(response, fields);

    }

  };

}



export function logFieldsFromResponse(response: any, fields: Record<string, string[] | string> = {}) {

  const data = parseJsonSafe(response.body) || {};

  Object.entries(fields).forEach(([label, paths]) => {

    const candidates = Array.isArray(paths) ? paths : [paths];

    const value = pickFirst(data, candidates);

    console.log(`${label}:`, value);

  });

}

