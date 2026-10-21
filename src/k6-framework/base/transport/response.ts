/**

 * Type trả về tối thiểu mà Flow/Scenario cần để log/check/extract hoạt động.

 *

 * - Với HTTP: đây là object response gốc của k6 (không wrap).

 * - Với SQL: framework dựng object có các field tương tự (status/body/timings...).

 */

export type StepResponse = {

  status: number;

  headers?: Record<string, any>;

  timings?: { duration?: number; [k: string]: any };

  body?: any;

  [k: string]: any;

};

