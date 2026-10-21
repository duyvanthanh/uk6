import { EndpointModel } from "./endpoint-model.js";
import { buildFormBody } from "../../core/form.js";
import { deepMerge, isPlainObject } from "../../core/object.js";

/**
 * Tạo endpoint factory để tái sử dụng baseUrl/path/method/defaults giữa nhiều step.
 *
 * Quy ước merge:
 * - `body`: deep merge (override theo field).
 * - `headers/params/tags`: shallow merge (key trùng thì override).
 */
export type CreateEndpointArgs = {
  /** Base URL (ví dụ: `__ENV.BASE_URL`). */
  baseUrl: string;
  /** Path (ví dụ: `/login`). */
  path: string;
  /**
   * `pathTemplate` tùy chọn, khuyến nghị khi dùng path params, ví dụ `/files/download/{id}`.
   *
   * Khi được cung cấp:
   * - đường dẫn request thực tế có thể dựng từ placeholder `{...}` qua `options.pathParams`
   * - `tags.endpoint` mặc định bám theo template để cardinality metrics ổn định
   */
  pathTemplate?: string;
  /** HTTP method (mặc định: `POST`). */
  method?: string;
  /** Tên hiển thị trong tag/log (mặc định: `${method} ${path}`). */
  name?: string;
  /** Body mặc định (object hoặc function nhận `options`). */
  defaultBody?: any | ((options: any) => any);
  /** Headers mặc định (object hoặc function nhận `options`). */
  defaultHeaders?: Record<string, string> | ((options: any) => Record<string, string>);
  /** Query params mặc định (object hoặc function nhận `options`). */
  defaultParams?: Record<string, any> | ((options: any) => Record<string, any>);
  /** Tags mặc định để attach vào request (phục vụ metrics/log). */
  baseTags?: Record<string, string>;
  /** Hàm encode body (ví dụ: encode form) trước khi gửi request. */
  bodyEncoder?: (body: any, options: any) => any;
  /** `responseType` cho k6/http (`"text"` | `"binary"`). Mặc định: `"text"`. */
  responseType?: "text" | "binary";
  /** Có log `responseBody` trong Flow/Scenario hay không. Mặc định: `true`. */
  logResponseBody?: boolean;
};

/**
 * Tạo factory endpoint trả về {@link EndpointModel}.
 *
 * @param args Cấu hình endpoint (baseUrl/path/method/defaults...).
 * @returns H?m factory d?ng `(options) => EndpointModel`.
 */
export function createEndpoint(args: CreateEndpointArgs) {
  const {
    baseUrl,
    path,
    pathTemplate: pathTemplateArg,
    method = "POST",
    name,
    defaultBody,
    defaultHeaders,
    defaultParams,
    baseTags,
    bodyEncoder,
    responseType,
    logResponseBody,
  } = args;

  if (!baseUrl) throw new Error('createEndpoint: "baseUrl" is required');
  if (!path) throw new Error('createEndpoint: "path" is required');

  function memoizeZeroArgObjectFactory(factoryOrObject: any) {
    if (typeof factoryOrObject !== "function" || factoryOrObject.length > 0) return factoryOrObject;
    let resolved = false;
    let cached: any;
    return function memoizedFactory() {
      if (!resolved) {
        cached = factoryOrObject({});
        resolved = true;
      }
      return cached;
    };
  }

  function hasOwnKeys(value: any) {
    return !!(value && typeof value === "object" && Object.keys(value).length > 0);
  }

  function canShallowMergeBody(baseBodyValue: any, overrideBodyValue: any) {
    if (!isPlainObject(baseBodyValue) || !isPlainObject(overrideBodyValue)) return false;
    const values = Object.values(overrideBodyValue);
    return values.every((value) => value === null || (typeof value !== "object" && typeof value !== "function"));
  }

  function buildPathFromTemplate(template: string, params: Record<string, any> = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_m, key) => {
      if (!Object.prototype.hasOwnProperty.call(params, key)) {
        throw new Error(`Missing pathParams["${key}"] for template "${template}"`);
      }
      return encodeURIComponent(String(params[key]));
    });
  }

  const inferredTemplate = /\{\w+\}/.test(String(path || "")) ? String(path) : null;
  const pathTemplate = String(pathTemplateArg || inferredTemplate || "");
  const stableEndpointTag = String(pathTemplate || path);
  const resolveDefaultHeaders = memoizeZeroArgObjectFactory(defaultHeaders);
  const resolveDefaultParams = memoizeZeroArgObjectFactory(defaultParams);
  const canReuseWithOverrides =
    (typeof defaultBody !== "function" || defaultBody.length === 0) &&
    (typeof defaultHeaders !== "function" || defaultHeaders.length === 0) &&
    (typeof defaultParams !== "function" || defaultParams.length === 0);

  function buildEndpointConfig(options: any = {}) {
    const bodyOverrides = options.body;
    const headerOverrides = options.headers;
    const paramOverrides = options.params;
    const tagOverrides = options.tags;
    const pathParams = options.pathParams ?? null;

    const hasDefaultBody = typeof defaultBody !== "undefined";
    const baseBody = typeof defaultBody === "function" ? defaultBody(options) : defaultBody;
    const hasBodyOverrides = Object.prototype.hasOwnProperty.call(options, "body");

    let body: any = null;
    if (hasDefaultBody || hasBodyOverrides) {
      if (!hasBodyOverrides) {
        body = typeof baseBody === "undefined" ? null : baseBody;
      } else if (canShallowMergeBody(baseBody, bodyOverrides)) {
        body = { ...(baseBody || {}), ...bodyOverrides };
      } else if (!hasDefaultBody) {
        body = bodyOverrides;
      } else {
        body = deepMerge(baseBody, bodyOverrides);
      }
    }

    if (body && typeof bodyEncoder === "function") {
      body = bodyEncoder(body, options);
    }

    const baseHeaders = typeof resolveDefaultHeaders === "function" ? resolveDefaultHeaders(options) : resolveDefaultHeaders || {};
    const headers = hasOwnKeys(headerOverrides) ? { ...(baseHeaders || {}), ...(headerOverrides || {}) } : baseHeaders || {};

    const baseParams = typeof resolveDefaultParams === "function" ? resolveDefaultParams(options) : resolveDefaultParams || {};
    const params = hasOwnKeys(paramOverrides) ? { ...(baseParams || {}), ...(paramOverrides || {}) } : baseParams || {};

    const tags = hasOwnKeys(tagOverrides)
      ? { endpoint: stableEndpointTag, ...(baseTags || {}), ...(tagOverrides || {}) }
      : baseTags
        ? { endpoint: stableEndpointTag, ...(baseTags || {}) }
        : { endpoint: stableEndpointTag };

    const effectiveTemplate = String(options.pathTemplate || pathTemplate || path);
    const effectivePath = pathParams ? buildPathFromTemplate(effectiveTemplate, pathParams) : options.path || effectiveTemplate;

    return {
      baseUrl: options.baseUrl || baseUrl,
      path: effectivePath,
      method: options.method || method,
      headers,
      params,
      body,
      tags,
      name: options.name || name,
      timeout: options.timeout,
      responseType: options.responseType || responseType,
      logResponseBody: typeof options.logResponseBody === "boolean" ? options.logResponseBody : logResponseBody,
    };
  }

  function applyOptionsToCachedEndpoint(endpoint: EndpointModel, options: any = {}) {
    if (!canReuseWithOverrides) {
      return endpoint.replace(buildEndpointConfig(options));
    }

    const bodyOverrides = options.body;
    const headerOverrides = options.headers;
    const paramOverrides = options.params;
    const tagOverrides = options.tags;
    const pathParams = options.pathParams ?? null;
    const hasBodyOverrides = Object.prototype.hasOwnProperty.call(options, "body");

    let body = endpoint.body;
    if (hasBodyOverrides) {
      if (canShallowMergeBody(body, bodyOverrides)) {
        body = { ...(body || {}), ...bodyOverrides };
      } else if (body === null || typeof body === "undefined") {
        body = bodyOverrides;
      } else {
        body = deepMerge(body, bodyOverrides);
      }
    }

    if (body && typeof bodyEncoder === "function") {
      body = bodyEncoder(body, options);
    }

    const headers = hasOwnKeys(headerOverrides) ? { ...(endpoint.headers || {}), ...(headerOverrides || {}) } : endpoint.headers || {};
    const params = hasOwnKeys(paramOverrides) ? { ...(endpoint.params || {}), ...(paramOverrides || {}) } : endpoint.params || {};
    const tags = hasOwnKeys(tagOverrides) ? { ...(endpoint.tags || {}), ...(tagOverrides || {}) } : endpoint.tags || {};
    const effectiveTemplate = String(options.pathTemplate || pathTemplate || path);
    const effectivePath = pathParams ? buildPathFromTemplate(effectiveTemplate, pathParams) : options.path || endpoint.path;

    return endpoint.replace({
      baseUrl: options.baseUrl || endpoint.baseUrl,
      path: effectivePath,
      method: options.method || endpoint.method,
      headers,
      params,
      body,
      tags,
      name: options.name || endpoint.name,
      timeout: options.timeout || endpoint.timeout,
      responseType: options.responseType || endpoint.responseType,
      logResponseBody: typeof options.logResponseBody === "boolean" ? options.logResponseBody : endpoint.logResponseBody,
    });
  }

  function createDeferredEndpointHandle(options: any) {
    let materialized: EndpointModel | null = null;
    return {
      __mb_endpoint_handle: true,
      __mb_factory: endpointFactory,
      __mb_options: options,
      __mb_materialize() {
        if (!materialized) materialized = new EndpointModel(buildEndpointConfig(options));
        return materialized;
      },
      getUrl() {
        return this.__mb_materialize().getUrl();
      },
      getRequestConfig() {
        return this.__mb_materialize().getRequestConfig();
      },
      get method() {
        return this.__mb_materialize().method;
      },
      get params() {
        return this.__mb_materialize().params;
      },
      get logResponseBody() {
        return this.__mb_materialize().logResponseBody;
      },
    };
  }

  function endpointFactory(options: any = {}) {
    if (options && Object.keys(options).length > 0) {
      return createDeferredEndpointHandle(options);
    }

    return new EndpointModel(buildEndpointConfig(options));
  }

  (endpointFactory as any).__mb_endpoint_factory = true;
  (endpointFactory as any).__mb_create_default = () => endpointFactory({});
  (endpointFactory as any).__mb_apply_cached_overrides = applyOptionsToCachedEndpoint;
  return endpointFactory;
}

/**
 * Encoder để gửi body dạng `application/x-www-form-urlencoded`
 *
 * Dùng với `bodyEncoder: encodeFormBody` + set `Content-Type` phù hợp trong headers.
 */
export function encodeFormBody(body: Record<string, any>): string {
  return buildFormBody(body);
}
