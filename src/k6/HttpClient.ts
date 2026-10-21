import { DataUtils } from "../core/data.js";



export interface K6Response {

  body: string;

  json(selector?: string): any;

  status: number;

  timings?: Record<string, number>;

  headers?: Record<string, string>;

}



export interface K6RequestParams {

  headers?: Record<string, string>;

  timeout?: string | number;

  tags?: Record<string, string>;

}



export interface K6HttpModule {

  get(url: string, params?: K6RequestParams): K6Response;

  post(url: string, body?: string | Record<string, unknown> | null, params?: K6RequestParams): K6Response;

  put?(url: string, body?: string | Record<string, unknown> | null, params?: K6RequestParams): K6Response;

  patch?(url: string, body?: string | Record<string, unknown> | null, params?: K6RequestParams): K6Response;

  del?(url: string, body?: string | null, params?: K6RequestParams): K6Response;

}



export interface K6RequestOptions {

  headers?: Record<string, string>;

  params?: Record<string, string | number | boolean>;

  timeout?: string | number;

  tags?: Record<string, string>;

}



function withQueryParams(url: string, params: Record<string, string | number | boolean> = {}): string {

  const query = DataUtils.buildFormBody(params);

  if (!query) {

    return url;

  }

  return `${url}${url.includes("?") ? "&" : "?"}${query}`;

}



function requestParams(options: K6RequestOptions = {}): K6RequestParams {

  return {

    headers: options.headers ?? {},

    timeout: options.timeout,

    tags: options.tags,

  };

}



export function createK6HttpClient(http: K6HttpModule) {

  return {

    get(url: string, options: K6RequestOptions = {}): K6Response {

      return http.get(withQueryParams(url, options.params), requestParams(options));

    },



    postJson(url: string, body: unknown = {}, options: K6RequestOptions = {}): K6Response {

      return http.post(

        url,

        JSON.stringify(body),

        requestParams({

          ...options,

          headers: {

            "Content-Type": "application/json",

            ...(options.headers ?? {}),

          },

        }),

      );

    },



    postForm(

      url: string,

      body: Record<string, string | number | boolean> = {},

      options: K6RequestOptions = {},

    ): K6Response {

      return http.post(

        url,

        DataUtils.buildFormBody(body),

        requestParams({

          ...options,

          headers: {

            "Content-Type": "application/x-www-form-urlencoded",

            ...(options.headers ?? {}),

          },

        }),

      );

    },

  };

}

