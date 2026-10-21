import { buildUrl } from "./endpoint/url.js";

import { deepMerge, isPlainObject } from "../../core/object.js";



function getDefaultServiceTag() {

  return typeof __ENV !== "undefined" && (__ENV as any).SERVICE_NAME ? (__ENV as any).SERVICE_NAME : "api-under-test";

}



function getDefaultEnvironmentTag() {

  return typeof __ENV !== "undefined" && (__ENV as any).TEST_ENV ? (__ENV as any).TEST_ENV : "local";

}



export type EndpointModelConfig = {

  baseUrl?: string;

  path?: string;

  method?: string;

  headers?: Record<string, string>;

  params?: Record<string, any>;

  body?: any;

  timeout?: number;

  responseType?: "text" | "binary";

  /** Điều khiển việc log `responseBody` trong Flow/Scenario. Mặc định: `true`. */

  logResponseBody?: boolean;

  tags?: Record<string, string>;

  name?: string;

};



/**

 * Model endpoint tối thiểu dùng cho `Flow` / `createScenario`.

 *

 * Bao gồm:

 * - Dựng URL (baseUrl + path + query params)

 * - Tạo request config (headers/tags/timeout/serialize body)

 *

 * Thường tạo instance thông qua `createEndpoint(...)`.

 */

export class EndpointModel {
  baseUrl: string;

  path: string;

  method: string;

  headers: Record<string, string>;

  params: Record<string, any>;

  body: any;

  timeout: number;

  responseType: "text" | "binary";

  logResponseBody: boolean;

  tags: Record<string, string>;

  name: string;

  private _requestConfigBase: any;

  private _serializedBody: any;

  private _baseConfig: EndpointModelConfig;



  constructor(config: EndpointModelConfig) {

    this.baseUrl = config.baseUrl || "";

    this.path = config.path || "";

    this.method = config.method || "POST";

    this.headers = config.headers || {};

    this.params = config.params || {};

    this.body = config.body || null;

    this.timeout = config.timeout || 30000;

    this.responseType = config.responseType || "text";

    this.logResponseBody = typeof config.logResponseBody === "boolean" ? config.logResponseBody : true;

    this.tags = config.tags || {};

    this.name = config.name || `${this.method} ${this.path}`;

    this._baseConfig = {

      baseUrl: this.baseUrl,

      path: this.path,

      method: this.method,

      headers: cloneValue(this.headers),

      params: cloneValue(this.params),

      body: cloneValue(this.body),

      timeout: this.timeout,

      responseType: this.responseType,

      logResponseBody: this.logResponseBody,

      tags: cloneValue(this.tags),

      name: this.name,

    };

    this._requestConfigBase = null;

    this._serializedBody = undefined;

    this.rebuildRequestArtifacts();

  }



  /**

   * Dựng URL đầy đủ từ `baseUrl + path + params`.

   *

   * @returns URL string.

   */

  getUrl(): string {

    return buildUrl(this.baseUrl, this.path, this.params);

  }



  /**

   * Tạo request config cho k6/http từ endpoint model.

   *

   * Bao gồm:

   * - `headers`

   * - `timeout`

   * - `tags` (name/endpoint/method/service/environment + custom tags)

   * - `body` (nếu method là POST/PUT/PATCH và body là object sẽ JSON.stringify)

   *

   * @returns Object config dùng cho `http.get/post/...`.

   */

  getRequestConfig(): any {

    if (typeof this._serializedBody === "undefined") return this._requestConfigBase;

    return { ...this._requestConfigBase, body: this._serializedBody };

  }



  /**

   * Merge thêm query params (shallow merge) vào `this.params`.

   *

   * - Mutate trực tiếp instance hiện tại.

   * - Key trùng sẽ bị override bởi `newParams`.

   * - `params` sẽ được dùng để build URL trong {@link getUrl}.

   *

   * Ví dụ:

   * ```js

   * const endpoint = login({ params: { lang: "vi" } })

   *   .updateParams({ page: 1, size: 20 });

   *

   * // GET https://.../path?lang=vi&page=1&size=20

   * const url = endpoint.getUrl();

   * ```

   *

   * @param newParams Params mới.

   * @returns `this` để chain.

   */

  updateParams(newParams: Record<string, any>): this {

    this.params = { ...this.params, ...newParams };

    this.rebuildRequestArtifacts();

    return this;

  }



  /**

   * Merge thêm headers (shallow merge) vào `this.headers`.

   *

   * - Mutate trực tiếp instance hiện tại.

   * - Header trùng key sẽ bị override bởi `newHeaders`.

   * - `headers` sẽ được dùng trong {@link getRequestConfig}.

   *

   * Ví dụ:

   * ```js

   * const endpoint = login()

   *   .updateHeaders({ Authorization: `Bearer ${token}` })

   *   .updateHeaders({ "X-Request-Id": reqId });

   *

   * const config = endpoint.getRequestConfig();

   * // config.headers.Authorization === `Bearer ...`

   * ```

   *

   * @param newHeaders Headers mới.

   * @returns `this` để chain.

   */

  updateHeaders(newHeaders: Record<string, string>): this {

    this.headers = { ...this.headers, ...newHeaders };

    this.rebuildRequestArtifacts();

    return this;

  }



  /**

   * Thay thế body (không merge).

   *

   * - Mutate trực tiếp instance hiện tại.

   * - `body` sẽ được serialize trong {@link getRequestConfig} nếu method là POST/PUT/PATCH.

   *

   * @param newBody Body mới.

   * @returns `this` để chain.

   */

  updateBody(newBody: any): this {

    this.body = newBody;

    this.rebuildRequestArtifacts();

    return this;

  }



  /**

   * Clone endpoint và override một phần config.

   *

   * @param newConfig Phần config override.

   * @returns EndpointModel mới.

   */

  clone(newConfig: EndpointModelConfig = {}): EndpointModel {

    return new EndpointModel({

      baseUrl: newConfig.baseUrl || this.baseUrl,

      path: newConfig.path || this.path,

      method: newConfig.method || this.method,

      headers: { ...this.headers, ...newConfig.headers },

      params: { ...this.params, ...newConfig.params },

      body: newConfig.body !== undefined ? newConfig.body : this.body,

      timeout: newConfig.timeout || this.timeout,

      tags: { ...this.tags, ...newConfig.tags },

      name: newConfig.name || this.name,

    });

  }



  resetToBase(): this {

    this.baseUrl = this._baseConfig.baseUrl || "";

    this.path = this._baseConfig.path || "";

    this.method = this._baseConfig.method || "POST";

    this.headers = cloneValue(this._baseConfig.headers) || {};

    this.params = cloneValue(this._baseConfig.params) || {};

    this.body = cloneValue(this._baseConfig.body) || null;

    this.timeout = this._baseConfig.timeout || 30000;

    this.responseType = this._baseConfig.responseType || "text";

    this.logResponseBody =

      typeof this._baseConfig.logResponseBody === "boolean" ? this._baseConfig.logResponseBody : true;

    this.tags = cloneValue(this._baseConfig.tags) || {};

    this.name = this._baseConfig.name || `${this.method} ${this.path}`;

    this.rebuildRequestArtifacts();

    return this;

  }



  applyOverrides(overrides: Partial<EndpointModelConfig> & { params?: Record<string, any> }): this {
    if (!overrides || typeof overrides !== "object") return this;

    if (typeof overrides.baseUrl !== "undefined") this.baseUrl = overrides.baseUrl || "";

    if (typeof overrides.path !== "undefined") this.path = overrides.path || "";

    if (typeof overrides.method !== "undefined") this.method = overrides.method || "POST";

    if (typeof overrides.timeout !== "undefined") this.timeout = overrides.timeout || 30000;

    if (typeof overrides.responseType !== "undefined") this.responseType = overrides.responseType || "text";

    if (typeof overrides.logResponseBody === "boolean") this.logResponseBody = overrides.logResponseBody;

    if (typeof overrides.name !== "undefined") this.name = overrides.name || `${this.method} ${this.path}`;

    if (overrides.headers && typeof overrides.headers === "object") this.headers = { ...(this.headers || {}), ...overrides.headers };

    if (overrides.params && typeof overrides.params === "object") this.params = { ...(this.params || {}), ...overrides.params };

    if (overrides.tags && typeof overrides.tags === "object") this.tags = { ...(this.tags || {}), ...overrides.tags };

    if (Object.prototype.hasOwnProperty.call(overrides, "body")) {

      const nextBody = (overrides as any).body;

      if (isPlainObject(this.body) && isPlainObject(nextBody)) {

        this.body = deepMerge(this.body, nextBody);

      } else {

        this.body = cloneValue(nextBody);

      }

    }

    this.rebuildRequestArtifacts();
    return this;
  }

  replace(config: EndpointModelConfig): this {
    this.baseUrl = config.baseUrl || "";
    this.path = config.path || "";
    this.method = config.method || "POST";
    this.headers = config.headers || {};
    this.params = config.params || {};
    this.body = config.body || null;
    this.timeout = config.timeout || 30000;
    this.responseType = config.responseType || "text";
    this.logResponseBody = typeof config.logResponseBody === "boolean" ? config.logResponseBody : true;
    this.tags = config.tags || {};
    this.name = config.name || `${this.method} ${this.path}`;
    this.rebuildRequestArtifacts();
    return this;
  }

  private rebuildRequestArtifacts() {
    this._requestConfigBase = {

      headers: this.headers,

      timeout: this.timeout,

      tags: {

        name: this.name,

        endpoint: this.path,

        method: this.method,

        service: getDefaultServiceTag(),

        environment: getDefaultEnvironmentTag(),

        ...this.tags,

      },

    };



    if (this.responseType) this._requestConfigBase.responseType = this.responseType;



    if (this.body && (this.method === "POST" || this.method === "PUT" || this.method === "PATCH")) {

      this._serializedBody = typeof this.body === "object" ? JSON.stringify(this.body) : this.body;

      return;

    }



    this._serializedBody = undefined;

  }

}



function cloneValue<T>(value: T): T {

  if (Array.isArray(value)) return value.map((item) => cloneValue(item)) as T;

  if (isPlainObject(value)) {

    const out: Record<string, any> = {};

    for (const key of Object.keys(value)) out[key] = cloneValue((value as any)[key]);

    return out as T;

  }

  return value;

}



