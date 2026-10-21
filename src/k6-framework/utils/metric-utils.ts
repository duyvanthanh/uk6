import { Counter, Rate } from "k6/metrics";

import type { StepCheckConfig } from "../base/scenario/types.js";



export type MetricFailIfMode = "any" | "all";

export type MetricKind = "rate" | "count";



export type MetricAttachment = {

  /** Marker nội bộ */

  __mb_metric_attachment: true;

  kind: MetricKind;

  metricName: string;

  checks: StepCheckConfig[];

  failIf: MetricFailIfMode;

};



const rateRegistry: Record<string, Rate> = {};

const counterRegistry: Record<string, Counter> = {};



function getRate(name: string) {

  if (!rateRegistry[name]) rateRegistry[name] = new Rate(name);

  return rateRegistry[name];

}



function getCounter(name: string) {

  if (!counterRegistry[name]) counterRegistry[name] = new Counter(name);

  return counterRegistry[name];

}



function computeWrongByChecks(

  res: any,

  dataOrGetter: any | (() => any),

  ctx: any,

  checks: StepCheckConfig[],

  failIf: MetricFailIfMode,

) {

  if (!Array.isArray(checks) || checks.length === 0) return false;



  let hasParsed = false;

  let parsed: any;

  const getParsed = () => {

    if (!hasParsed) {

      parsed = typeof dataOrGetter === "function" ? dataOrGetter() : dataOrGetter;

      hasParsed = true;

    }

    return parsed;

  };



  let sawFailure = false;

  let sawSuccess = false;



  for (const c of checks) {

    try {

      const cond: any = c?.condition;

      const ok = typeof cond === "function" ? Boolean(cond.length >= 2 ? cond(res, getParsed(), ctx) : cond(res)) : false;

      if (ok) {

        sawSuccess = true;

      } else {

        sawFailure = true;

        if (failIf !== "all") return true;

      }

    } catch (_e) {

      sawFailure = true;

      if (failIf !== "all") return true;

    }

  }



  return failIf === "all" ? sawFailure && !sawSuccess : sawFailure;

}



/**

 * Đẩy bước assert vào metric dạng rate, ví dụ:

 * 

 * export const options = {

 * thresholds: {

 *   http_req_duration: ['p(95)<2000'],

 *   http_req_failed: ['rate<0.1'],

 *   checks: ['rate>0.95'],

 *   metric_name: [{ threshold: 'rate<0.1', abortOnFail: true, delayAbortEval: '0s' }],

 * }

 * };

 * 

 * Trong flow step hoặc concurrent step sử dụng:

 * 

 * thresholds: [ addToMetricRate('metric_name', [assertResponseTime(1000)]) 

 *

 * @param metricName 

 * @param checks 

 * @param opts 

 * @returns 

 */export function addToMetricRate(

  metricName: string,

  checks: StepCheckConfig[] = [],

  opts: { failIf?: MetricFailIfMode } = {},

): MetricAttachment {

  // Metric cần được định nghĩa trong `options.thresholds`

  getRate(String(metricName));

  return {

    __mb_metric_attachment: true,

    kind: "rate",

    metricName: String(metricName),

    checks,

    failIf: opts.failIf || "any",

  };

}



/**

 * Đẩy bước assert vào metric dạng count, ví dụ:

 * 

 * export const options = {

 * thresholds: {

 *   http_req_duration: ['p(95)<2000'],

 *   http_req_failed: ['rate<0.1'],

 *   checks: ['rate>0.95'],

 *   metric_name: [{ threshold: 'count<10', abortOnFail: true, delayAbortEval: '0s' }],

 * }

 * };

 * 

 * Trong flow step hoặc concurrent step sử dụng:

 * 

 * thresholds: [ addToMetricCount('metric_name', [assertResponseTime(1000)]) 

 *

 * @param metricName 

 * @param checks 

 * @param opts 

 * @returns 

 */

export function addToMetricCount(

  metricName: string,

  checks: StepCheckConfig[] = [],

  opts: { failIf?: MetricFailIfMode } = {},

): MetricAttachment {

  // Bảo đảm metric được đăng ký trong pha init để `options.thresholds` có thể ref tới 

  getCounter(String(metricName));

  return {

    __mb_metric_attachment: true,

    kind: "count",

    metricName: String(metricName),

    checks,

    failIf: opts.failIf || "any",

  };

}



/**

 * @internal Attach metric cho step đơn lẻ

 *

 * - `rate`: boolean (wrong=true).

 * - `count`: +=1 when wrong.

 */

export function applyMetricAttachments(res: any, attachments: any[] = [], dataOrGetter?: any | (() => any), ctx?: any) {

  if (!Array.isArray(attachments) || attachments.length === 0) return;



  attachments.forEach((a) => {

    const att = a as MetricAttachment;

    if (!att || att.__mb_metric_attachment !== true) return;



    const wrong = computeWrongByChecks(res, dataOrGetter, ctx, att.checks || [], att.failIf || "any");

    if (att.kind === "rate") {

      getRate(att.metricName).add(wrong);

      return;

    }

    if (att.kind === "count") {

      if (wrong) getCounter(att.metricName).add(1);

    }

  });

}

