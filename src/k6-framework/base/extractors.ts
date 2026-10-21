import { parseJsonSafe, pickFirst } from "../utils/response-utils.js";



/**

 * Extractors: map `{ ctxKey: extractor }` để ghi dữ liệu từ response vào `ctx`.

 * - extractor có thể là function hoặc dot-path string.

 * - nếu body không parse được JSON thì extractor theo dot-path trả `undefined`.

 */

export type Extractor = ((response: any, data: any) => any) | string;

export type ExtractorsMap = Record<string, Extractor>;



type ApplyExtractorsOptions = { label?: string };



/**  @internal Áp dụng extractor và merge kết quả vào `ctx`. */

export function applyExtractors(

  ctx: Record<string, any>,

  extractors: ExtractorsMap | undefined,

  response: any,

  dataOrGetter?: any | (() => any),

  options: ApplyExtractorsOptions = {},

) {

  if (!extractors || Object.keys(extractors).length === 0) return ctx;



  const labelSuffix = options.label ? ` in "${options.label}"` : "";

  let hasParsed = false;

  let parsed: any;



  const getParsed = () => {

    if (!hasParsed) {

      parsed = typeof dataOrGetter === "function" ? dataOrGetter() : dataOrGetter;

      if (parsed == null) parsed = parseJsonSafe(response?.body) || {};

      hasParsed = true;

    }

    return parsed;

  };



  Object.entries(extractors).forEach(([key, extractor]) => {

    try {

      if (typeof extractor === "function") {

        ctx[key] = extractor(response, getParsed());

      } else if (typeof extractor === "string") {

        ctx[key] = pickFirst(getParsed(), [extractor]);

      }

    } catch (error: any) {

      console.warn(`Failed to extract ${key}${labelSuffix}: ${error?.message || String(error)}`);

    }

  });



  return ctx;

}



