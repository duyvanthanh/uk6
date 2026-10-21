import http from "k6/http";

import type { StepResponse } from "./transport/response.js";



/**

 * Wrapper gọi `k6/http` theo method.

 *

 * @internal Dùng nội bộ bởi Flow/Scenario để tập trung chỗ map method -> http.get/post/...

 */

export function httpRequest(method: string, url: string, body: any, config: any): StepResponse {

  switch (method) {

    case "GET":

      return http.get(url, config) as any;

    case "POST":

      return http.post(url, body, config) as any;

    case "PUT":

      return http.put(url, body, config) as any;

    case "PATCH":

      return http.patch(url, body, config) as any;

    case "DELETE":

      return http.del(url, config) as any;

    default:

      throw new Error(`Unsupported HTTP method: ${method}`);

  }

}

