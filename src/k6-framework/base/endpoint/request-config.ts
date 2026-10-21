export function buildRequestConfig({

  headers,

  timeout,

  tags,

  name,

  path,

  method,

  body,

  responseType,

}: {

  headers: Record<string, string>;

  timeout: number;

  tags: Record<string, string>;

  name: string;

  path: string;

  method: string;

  body: any;

  responseType?: "text" | "binary";

}) {

  const config: any = {

    headers,

    timeout,

    tags: {

      name,

      endpoint: path,

      method,

      service: __ENV.SERVICE_NAME || "api-under-test",

      environment: __ENV.TEST_ENV || "local",

      ...tags,

    },

  };



  if (responseType) config.responseType = responseType;



  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {

    config.body = typeof body === "object" ? JSON.stringify(body) : body;

  }



  return config;

}



