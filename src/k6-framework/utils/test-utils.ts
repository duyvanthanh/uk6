/**

 * Các tiện ích lặt vặt cho k6 test

 *

 * Lưu ý: đây là wrapper tiện lợi; với helper cho ID/form/query nên ưu tiên `uk6/core`

 */

import { DataUtils } from "../../core/data.js";



export class DataGenerator {

  /** @param length Độ dài chuỗi. @returns Chuỗi ngẫu nhiên (A-Z a-z 0-9). */

  static randomString(length = 10) {

    return DataUtils.randomString(length);

  }



  /** @returns Email ngẫu nhiên dạng `test.<rand>@example.com`. */

  static randomEmail() {

    return `test.${this.randomString(8)}@example.com`;

  }



  /** @param min Giá trị nhỏ nhất (bao gồm). @param max Giá trị lớn nhất (bao gồm). @returns Số nguyên ngẫu nhiên. */

  static randomNumber(min = 1, max = 100) {

    return DataUtils.randomNumber(min, max);

  }



  /** @param array Mảng đầu vào. @returns 1 phần tử ngẫu nhiên. */

  static randomFromArray<T>(array: T[]): T {

    return DataUtils.randomFromArray(array);

  }



  /** @returns Đối tượng user giả lập để test. */

  static generateUser() {

    const firstNames = ["John", "Jane", "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"];

    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];



    return {

      id: this.randomNumber(1000, 9999),

      firstName: this.randomFromArray(firstNames),

      lastName: this.randomFromArray(lastNames),

      email: this.randomEmail(),

      username: this.randomString(8),

      age: this.randomNumber(18, 65),

    };

  }



  /** @returns Đối tượng product giả lập để test. */

  static generateProduct() {

    const products = ["Laptop", "Smartphone", "Tablet", "Headphones", "Camera", "Watch", "Speaker", "Monitor", "Keyboard", "Mouse"];



    return {

      id: this.randomNumber(1, 1000),

      name: this.randomFromArray(products),

      price: this.randomNumber(10, 2000),

      category: this.randomFromArray(["Electronics", "Accessories", "Computers"]),

      inStock: Math.random() > 0.2,

    };

  }

}



/**

 * Check kiểu predicate (trả boolean).

 *

 * Nếu dùng `Flow` / `createScenario`, nên ưu tiên các builder dạng object: `assertStatus`, `assertPath`, `assertTiming`.

 */

export class Checks {

  /** @param expectedStatus Mã HTTP kỳ vọng. @returns Hàm kiểm `(response) => boolean`. */

  static statusIs(expectedStatus: number) {

    return (response: any) => response.status === expectedStatus;

  }



  /** @param maxTime Ngưỡng thời gian (ms). @returns Hàm kiểm `(response) => boolean`. */

  static responseTimeBelow(maxTime: number) {

    return (response: any) => response.timings.duration < maxTime;

  }



  /** @param property Tên thuộc tính cấp 1. @returns Hàm kiểm `(response) => boolean`. */

  static hasJsonProperty(property: string) {

    return (response: any) => {

      try {

        const data = JSON.parse(response.body);

        return Object.prototype.hasOwnProperty.call(data, property);

      } catch {

        return false;

      }

    };

  }



  /** @param property Tên thuộc tính cấp 1. @param expectedValue Giá trị kỳ vọng. @returns Hàm kiểm `(response) => boolean`. */

  static jsonPropertyEquals(property: string, expectedValue: any) {

    return (response: any) => {

      try {

        const data = JSON.parse(response.body);

        return data[property] === expectedValue;

      } catch {

        return false;

      }

    };

  }



  /** @param minLength Độ dài tối thiểu. @returns Hàm kiểm `(response) => boolean`. */

  static arrayLengthGreaterThan(minLength: number) {

    return (response: any) => {

      try {

        const data = JSON.parse(response.body);

        return Array.isArray(data) && data.length > minLength;

      } catch {

        return false;

      }

    };

  }



  /** @param expectedType Giá trị header `Content-Type` kỳ vọng (vd: `application/json`). @returns Hàm kiểm `(response) => boolean`. */

  static contentTypeIs(expectedType: string) {

    return (response: any) => {

      const contentType = response.headers["Content-Type"] || response.headers["content-type"];

      return contentType && contentType.includes(expectedType);

    };

  }

}



/**

 * Extractor cho response (trả giá trị đã trích xuất) dùng ad-hoc.

 *

 * Nếu dùng `Flow` / `createScenario`, nên ưu tiên `extractValues({ key: paths })` vì ngắn gọn và đồng nhất.

 *

 * Ví dụ (dùng ad-hoc extractor):

 * ```js

 * import { createStep } from "uk6/k6-framework";

 * import { Extractors } from "uk6/k6-framework/utils/test-utils";

 *

 * createStep({

 *   name: "login",

 *   endpoint: login,

 *   extractors: {

 *     sessionId: Extractors.jsonPath("result.sessionId"),

 *     token: Extractors.header("Authorization"),

 *   },

 * });

 * ```

 */

export class Extractors {

  /** @param path Dot-path (hỗ trợ index `arr[0]`). @returns Hàm trích xuất `(response) => any`. */

  static jsonPath(path: string) {

    return (response: any) => {

      try {

        const data = JSON.parse(response.body);

        const pathParts = path.split(".");

        let result: any = data;



        for (const part of pathParts) {

          if (result && typeof result === "object") {

            if (part.includes("[") && part.includes("]")) {

              const [arrayName, indexStr] = part.split("[");

              const index = parseInt(indexStr.replace("]", ""), 10);

              result = result[arrayName];

              if (Array.isArray(result) && index < result.length) {

                result = result[index];

              } else {

                return null;

              }

            } else {

              result = result[part];

            }

          } else {

            return null;

          }

        }



        return result;

      } catch {

        return null;

      }

    };

  }



  /** @returns Hàm trích xuất `(response) => any` trả về 1 phần tử ngẫu nhiên trong JSON array body. */

  static randomFromJsonArray() {

    return (response: any) => {

      try {

        const data = JSON.parse(response.body);

        if (Array.isArray(data) && data.length > 0) {

          return data[Math.floor(Math.random() * data.length)];

        }

        return null;

      } catch {

        return null;

      }

    };

  }



  /** @param headerName Tên header. @returns Hàm trích xuất `(response) => any`. */

  static header(headerName: string) {

    return (response: any) => response.headers[headerName] || response.headers[headerName.toLowerCase()];

  }



  /** @param cookieName Tên cookie. @returns Hàm trích xuất `(response) => string | null`. */

  static cookie(cookieName: string) {

    return (response: any) => {

      const cookies = response.cookies;

      return cookies[cookieName] ? cookies[cookieName][0].value : null;

    };

  }

}



/**

 * Helper để build mảng `stages` cho k6 options.

 */

export class LoadPatterns {

  /** @param targetVUs Số VU mục tiêu. @param duration Thời gian (vd: `30s`). @returns `stages[]` cho tuỳ chọn k6. */

  static rampUp(targetVUs: number, duration: string) {

    return [{ duration, target: targetVUs }];

  }



  /** @param rampDuration Thời gian tăng tải. @param targetVUs VU mục tiêu. @param stayDuration Thời gian giữ. */

  static rampUpStayDown(rampDuration: string, targetVUs: number, stayDuration: string) {

    return [

      { duration: rampDuration, target: targetVUs },

      { duration: stayDuration, target: targetVUs },

      { duration: rampDuration, target: 0 },

    ];

  }



  /** @param steps Số bước. @param stepDuration Thời gian mỗi bước. @param maxVUs VU tối đa. */

  static steppedLoad(steps: number, stepDuration: string, maxVUs: number) {

    const stages: Array<{ duration: string; target: number }> = [];

    const stepSize = Math.ceil(maxVUs / steps);



    for (let i = 1; i <= steps; i++) {

      const target = Math.min(i * stepSize, maxVUs);

      stages.push({ duration: stepDuration, target });

    }



    stages.push({ duration: stepDuration, target: 0 });

    return stages;

  }



  /**

   * @param normalVUs VU bình thường.

   * @param spikeVUs VU spike.

   * @param spikeDuration Thời gian spike (vd: `30s`).

   * @param totalDurationSeconds Tổng thời gian test (giây).

   */

  static spike(normalVUs: number, spikeVUs: number, spikeDuration: string, totalDurationSeconds: number) {

    const spikeSeconds = parseDurationSeconds(spikeDuration);

    const normalDurationSeconds = Math.max(0, (totalDurationSeconds - spikeSeconds) / 2);



    return [

      { duration: `${normalDurationSeconds}s`, target: normalVUs },

      { duration: "10s", target: spikeVUs },

      { duration: spikeDuration, target: spikeVUs },

      { duration: "10s", target: normalVUs },

      { duration: `${normalDurationSeconds}s`, target: normalVUs },

      { duration: "30s", target: 0 },

    ];

  }

}



function parseDurationSeconds(duration: string): number {

  const m = String(duration).trim().match(/^(\d+)\s*s$/i);

  if (!m) return 0;

  return parseInt(m[1], 10);

}



export class TestData {

  data: Map<string, any>;



  constructor() {

    this.data = new Map();

  }



  set(key: string, value: any) {

    this.data.set(key, value);

  }



  get(key: string) {

    return this.data.get(key);

  }



  has(key: string) {

    return this.data.has(key);

  }



  delete(key: string) {

    return this.data.delete(key);

  }



  clear() {

    this.data.clear();

  }



  getUniqueData(prefix = "test") {

    const vuId = __VU || 1;

    const iteration = __ITER || 1;

    return `${prefix}_vu${vuId}_iter${iteration}_${Date.now()}`;

  }

}



/**

 * Helper nhẹ cho metrics để log/phân tích trong script.

 */

export class Metrics {

  static logPerformanceMetrics(response: any, stepName: string) {

    console.log(`[${stepName}] Status: ${response.status}, Duration: ${response.timings.duration}ms`);

  }



  static isSlowResponse(response: any, threshold = 1000) {

    return response.timings.duration > threshold;

  }



  static calculateThroughput(responses: any[], durationMs: number) {

    return responses.length / (durationMs / 1000);

  }

}



/**

 * Helper nhỏ xoay quanh `__ENV`, `__VU`, `__ITER`.

 */

export class Environment {

  static getEnvironment() {

    return __ENV.ENVIRONMENT || "local";

  }



  static isDebugMode() {

    return __ENV.DEBUG === "true";

  }



  static getVUCount() {

    return __VU || 1;

  }



  static getIteration() {

    return __ITER || 1;

  }

}

