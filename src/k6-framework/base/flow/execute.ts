import http from "k6/http";

import { check } from "k6";

import { httpRequest } from "../http-request.js";

import { sqlRequest } from "../sql-request.js";

import { serializeError } from "./telemetry.js";

import type { FlowRuntime } from "./types.js";

import { applyStepExtractors } from "./ctx.js";

import { applyMetricAttachments } from "../../utils/metric-utils.js";

import {

  buildStepLogEvent,

  getStepLoggingMode,

  shouldEmitCompactCallEvent,

  shouldEmitFullCallEvent,

  shouldEmitFullErrorEvent,

  shouldLogExceptions,

} from "../logging.js";



function resolveRuntimeEndpoint(factoryOrInstance: any, ctx: any) {

  if (factoryOrInstance && (factoryOrInstance as any).__mb_endpoint_factory === true) {

    const cached = (factoryOrInstance as any).__mb_cached_endpoint;

    if (cached && typeof cached.resetToBase === "function") return cached.resetToBase();

    const created =

      typeof (factoryOrInstance as any).__mb_create_default === "function"

        ? (factoryOrInstance as any).__mb_create_default()

        : factoryOrInstance({});

    (factoryOrInstance as any).__mb_cached_endpoint = created;

    return created;

  }

  if (typeof factoryOrInstance === "function") return factoryOrInstance(ctx);

  return factoryOrInstance;

}



function isEndpointPatch(value: any) {

  return !!value && typeof value === "object" && typeof value.getUrl !== "function" && typeof value.getRequestConfig !== "function";

}



function isEndpointLike(value: any) {

  return !!value && typeof value.getUrl === "function" && typeof value.getRequestConfig === "function";

}



function isEndpointHandle(value: any) {

  return !!value && value.__mb_endpoint_handle === true && typeof value.__mb_materialize === "function";

}



function createLazyParsedData(response: any) {

  let resolved = false;

  let parsed: any;

  return () => {

    if (!resolved) {

      if (typeof response?.body === "string") {

        try {

          parsed = response.json();

        } catch (_e) {

          parsed = {};

        }

      } else {

        parsed = response?.body ?? {};

      }

      resolved = true;

    }

    return parsed;

  };

}



function hasFailedCheck(checkResults: Record<string, boolean>) {

  for (const key in checkResults) {

    if (checkResults[key] === false) return true;

  }

  return false;

}



function getSafeBody(response: any, endpoint: any) {

  const shouldLogBody = typeof endpoint?.logResponseBody === "boolean" ? endpoint.logResponseBody : true;

  return shouldLogBody ? response.body : "[response body omitted]";

}



function createPostprocessorCompatArg(response: any, ctx: any) {

  const responseFirstKeys = new Set([

    "body",

    "status",

    "headers",

    "timings",

    "cookies",

    "error",

    "error_code",

    "proto",

    "request",

    "remote_ip",

    "remote_port",

  ]);

  return new Proxy(

    {},

    {

      get(_target, prop) {

        if (typeof prop === "symbol") return undefined;

        if (responseFirstKeys.has(prop)) return response?.[prop];

        if (ctx && prop in ctx) return ctx[prop];

        return response?.[prop];

      },

      set(_target, prop, value) {

        if (ctx && typeof prop !== "symbol") {

          ctx[prop] = value;

          return true;

        }

        return false;

      },

      has(_target, prop) {

        if (typeof prop === "symbol") return false;

        return (ctx && prop in ctx) || !!responseFirstKeys.has(prop) || (response && prop in response);

      },

      ownKeys() {

        const ctxKeys = ctx ? Reflect.ownKeys(ctx) : [];

        const responseKeys = response ? Reflect.ownKeys(response) : [];

        return Array.from(new Set([...ctxKeys, ...responseKeys]));

      },

      getOwnPropertyDescriptor(_target, prop) {

        if (typeof prop === "symbol") return undefined;

        if ((ctx && prop in ctx) || (response && prop in response)) {

          return { configurable: true, enumerable: true };

        }

        return undefined;

      },

    },

  );

}



function runPostprocessor(postprocessor: any, response: any, ctx: any) {

  if (!postprocessor) return;

  if (postprocessor.length > 1) {

    postprocessor(response, ctx);

    return;

  }

  if (postprocessor.length === 1) {

    postprocessor(createPostprocessorCompatArg(response, ctx));

    return;

  }

  postprocessor();

}



/**  @internal Thực thi 1 step (preprocess -> request -> checks/extract/postprocess + log). */

export function executeStep(flow: FlowRuntime, step: any, stepIndex: number) {

  let endpoint = resolveRuntimeEndpoint(step.endpoint, flow.globalData);

  if (step.preprocessor) {

    const usesEndpointArg = step.preprocessor.length > 1;

    const nextEndpoint = usesEndpointArg ? step.preprocessor(endpoint, flow.globalData) : step.preprocessor(flow.globalData);

    if (

      isEndpointHandle(nextEndpoint) &&

      step.endpoint &&

      nextEndpoint.__mb_factory === step.endpoint &&

      endpoint &&

      typeof endpoint.resetToBase === "function" &&

      typeof (step.endpoint as any).__mb_apply_cached_overrides === "function"

    ) {

      endpoint.resetToBase();

      endpoint = (step.endpoint as any).__mb_apply_cached_overrides(endpoint, nextEndpoint.__mb_options);

    } else if (isEndpointHandle(nextEndpoint)) {

      endpoint = nextEndpoint.__mb_materialize();

    } else if (isEndpointLike(nextEndpoint)) {

      endpoint = nextEndpoint;

    } else if (isEndpointPatch(nextEndpoint) && endpoint && typeof endpoint.applyOverrides === "function") {

      endpoint.applyOverrides(nextEndpoint as any);

    } else {

      endpoint = nextEndpoint || endpoint;

    }

  }



  if (!endpoint || typeof endpoint.getUrl !== "function" || typeof endpoint.getRequestConfig !== "function") {

    throw new Error(`Invalid endpoint in step "${step.name}". Expected EndpointModel-like object.`);

  }



  const url = endpoint.getUrl();

  const config = endpoint.getRequestConfig();

  const method = String(endpoint.method || "GET").toUpperCase();

  const requestBody = ["POST", "PUT", "PATCH"].includes(method) ? config.body : undefined;



  const protocol = (endpoint as any).protocol;

  const isSql = protocol === "sql" || method === "SQL";

  const response = isSql ? sqlRequest(endpoint, config) : httpRequest(method, url, requestBody, config);

  const getParsedData = createLazyParsedData(response);



  const checkResults: Record<string, boolean> = {};

  if (step.checks && step.checks.length > 0) {

    step.checks.forEach((checkConfig: any) => {

      const checkName = checkConfig.name || "unnamed_check";

      const cond = checkConfig.condition;

      const ok = check(response, {

        [checkName]: (r: any) =>

          typeof cond === "function" && cond.length >= 2 ? cond(r, getParsedData(), flow.globalData) : cond(r),

      });

      checkResults[checkName] = ok;

    });

  }



  applyMetricAttachments(response, (step as any).thresholds || [], getParsedData, flow.globalData);

  applyStepExtractors(flow, step, response, getParsedData);



  runPostprocessor(step.postprocessor, response, flow.globalData);



  const success = protocol === "sql" ? response.status === 0 : response.status >= 200 && response.status < 300;

  const failedCheck = hasFailedCheck(checkResults);

  const stepLoggingMode = getStepLoggingMode();

  const emitCompactCallLog = shouldEmitCompactCallEvent({ mode: stepLoggingMode, success, failedCheck });

  const emitFullCallLog = shouldEmitFullCallEvent({ mode: stepLoggingMode, success, failedCheck });

  const emitErrorLog = shouldEmitFullErrorEvent({ mode: stepLoggingMode, success, failedCheck });



  if (emitErrorLog) {

    const safeBody = getSafeBody(response, endpoint);

    try {

      console.error(

        JSON.stringify(

          buildStepLogEvent({

            mode: stepLoggingMode,

            type: "flow_step_error",

            flowName: flow.name,

            stepName: step.name,

            stepIndex,

            status: response.status,

            url,

            method: endpoint.method,

            requestBody,

            requestHeaders: config.headers,

            requestParams: endpoint.params,

            timeout: config.timeout,

            checks: checkResults,

            tags: config.tags,

            response: {

              status: response.status,

              headers: response.headers,

              timings: response.timings,

              remote_ip: (response as any).remote_ip,

              remote_port: (response as any).remote_port,

              request_url: (response as any)?.request?.url,

              body: safeBody,

            },

          }),

        ),

      );

    } catch (_e) {

      console.error(`flow_step_error: ${flow.name} -> ${step.name} status=${response.status}`);

    }

  }



  if (emitCompactCallLog || emitFullCallLog) {

    const eventMode = emitCompactCallLog ? "compact_success_full_error" : "full";

    const safeBody = eventMode === "full" ? getSafeBody(response, endpoint) : "[response body omitted]";

    try {

      // eslint-disable-next-line no-console

      console.log(

        JSON.stringify(

          buildStepLogEvent({

            mode: eventMode,

            type: "flow_step_call",

            flowName: flow.name,

            stepName: step.name,

            stepIndex,

            url,

            method: endpoint.method,

            requestBody,

            requestHeaders: config.headers,

            requestParams: endpoint.params,

            timeout: config.timeout,

            checks: checkResults,

            tags: config.tags,

            response: {

              status: response.status,

              headers: response.headers,

              timings: response.timings,

              remote_ip: (response as any).remote_ip,

              remote_port: (response as any).remote_port,

              request_url: (response as any)?.request?.url,

              body: safeBody,

            },

          }),

        ),

      );

    } catch (_e) {

      // eslint-disable-next-line no-console

      console.log(`flow_step_call: ${flow.name} -> ${step.name} status=${response.status}`);

    }

  }



  return {

    stepName: step.name,

    stepIndex,

    success,

    status: response.status,

    duration: response.timings?.duration,

    checks: checkResults,

    extractedData: Object.keys(step.extractors || {}),

  };

}



/** @internal Chạy group song song bằng `http.batch`. */

export function executeConcurrentGroup(flow: FlowRuntime, groupEntry: any, startStepIndex: number) {

  const steps: any[] = Array.isArray(groupEntry.steps) ? groupEntry.steps : [];

  const prepared: any[] = [];

  const results: any[] = [];

  let hasFailure = false;

  let maxDelay = 0;

  let nextStepIndex = startStepIndex;



  // 1) Chuẩn bị requests (skip/preprocess/validate/build request configs). 

  for (let j = 0; j < steps.length; j++) {

    const step = steps[j];



    if (!flow.shouldRunStepByLoad(step, nextStepIndex)) {

      nextStepIndex += 1;

      continue;

    }



    if (step.skipOn && step.skipOn(flow.globalData)) {

      nextStepIndex += 1;

      continue;

    }



    let endpoint = resolveRuntimeEndpoint(step.endpoint, flow.globalData);

    try {

      if (step.preprocessor) {

        const usesEndpointArg = step.preprocessor.length > 1;

        const nextEndpoint = usesEndpointArg ? step.preprocessor(endpoint, flow.globalData) : step.preprocessor(flow.globalData);

        if (

          isEndpointHandle(nextEndpoint) &&

          step.endpoint &&

          nextEndpoint.__mb_factory === step.endpoint &&

          endpoint &&

          typeof endpoint.resetToBase === "function" &&

          typeof (step.endpoint as any).__mb_apply_cached_overrides === "function"

        ) {

          endpoint.resetToBase();

          endpoint = (step.endpoint as any).__mb_apply_cached_overrides(endpoint, nextEndpoint.__mb_options);

        } else if (isEndpointHandle(nextEndpoint)) {

          endpoint = nextEndpoint.__mb_materialize();

        } else if (isEndpointLike(nextEndpoint)) {

          endpoint = nextEndpoint;

        } else if (isEndpointPatch(nextEndpoint) && endpoint && typeof endpoint.applyOverrides === "function") {

          endpoint.applyOverrides(nextEndpoint as any);

        } else {

          endpoint = nextEndpoint || endpoint;

        }

      }



      if (!endpoint || typeof endpoint.getUrl !== "function" || typeof endpoint.getRequestConfig !== "function") {

        throw new Error(`Invalid endpoint in step "${step.name}". Expected EndpointModel-like object.`);

      }



      const url = endpoint.getUrl();

      const config = endpoint.getRequestConfig();

      const method = String(endpoint.method || "GET").toUpperCase();

      const requestBody = ["POST", "PUT", "PATCH"].includes(method) ? config.body : undefined;



      prepared.push({

        step,

        stepIndex: nextStepIndex,

        endpoint,

        url,

        config,

        method,

        requestBody,

      });

      maxDelay = Math.max(maxDelay, Number(step.delay || 0));

    } catch (error: any) {

      if (shouldLogExceptions(getStepLoggingMode())) {

        console.error(

          JSON.stringify({

            type: "flow_step_exception",

            flowName: flow.name,

            stepName: step.name,

            stepIndex: nextStepIndex,

            error: serializeError(error),

          }),

        );

      }

      results.push({

        stepName: step.name,

        stepIndex: nextStepIndex,

        success: false,

        error: error?.message,

      });

      hasFailure = true;

    } finally {

      nextStepIndex += 1;

    }

  }



  if (prepared.length === 0) {

    return { results, hasFailure, maxDelay, nextStepIndex };

  }



  // 2) Bắn requests song song

  const batchRequests = prepared.map((p) => ({

    method: p.method,

    url: p.url,

    body: p.requestBody,

    params: p.config,

  }));

  const responses: any[] = http.batch(batchRequests) as any;



  // 3) Resolve checks/extractors/logging theo thứ tự (ctx merge). 

  for (let k = 0; k < prepared.length; k++) {

    const p = prepared[k];

    const response = responses[k];

    const step = p.step;

    const endpoint = p.endpoint;

    const config = p.config;

    const url = p.url;

    const requestBody = p.requestBody;

    const getParsedData = createLazyParsedData(response);



    const checkResults: Record<string, boolean> = {};

    if (step.checks && step.checks.length > 0) {

      step.checks.forEach((checkConfig: any) => {

        const checkName = checkConfig.name || "unnamed_check";

        const cond = checkConfig.condition;

        const ok = check(response, {

          [checkName]: (r: any) =>

            typeof cond === "function" && cond.length >= 2 ? cond(r, getParsedData(), flow.globalData) : cond(r),

        });

        checkResults[checkName] = ok;

      });

    }



    applyMetricAttachments(response, (step as any).thresholds || [], getParsedData, flow.globalData);

    applyStepExtractors(flow, step, response, getParsedData);



    runPostprocessor(step.postprocessor, response, flow.globalData);



    const success = response.status >= 200 && response.status < 300;

    const failedCheck = hasFailedCheck(checkResults);

    const stepLoggingMode = getStepLoggingMode();

    const emitCompactCallLog = shouldEmitCompactCallEvent({ mode: stepLoggingMode, success, failedCheck });

    const emitFullCallLog = shouldEmitFullCallEvent({ mode: stepLoggingMode, success, failedCheck });

    const emitErrorLog = shouldEmitFullErrorEvent({ mode: stepLoggingMode, success, failedCheck });



    if (emitErrorLog) {

      const safeBody = getSafeBody(response, endpoint);

      try {

        console.error(

          JSON.stringify(

            buildStepLogEvent({

              mode: stepLoggingMode,

              type: "concurrent_step_error",

              flowName: flow.name,

              stepName: step.name,

              stepIndex: p.stepIndex,

              status: response.status,

              url,

              method: endpoint.method,

              requestBody,

              requestHeaders: config.headers,

              requestParams: endpoint.params,

              timeout: config.timeout,

              checks: checkResults,

              tags: config.tags,

              response: {

                status: response.status,

                headers: response.headers,

                timings: response.timings,

                remote_ip: (response as any).remote_ip,

                remote_port: (response as any).remote_port,

                request_url: (response as any)?.request?.url,

                body: safeBody,

              },

            }),

          ),

        );

      } catch (_e) {

        console.error(`flow_step_error: ${flow.name} -> ${step.name} status=${response.status}`);

      }

    }



    if (emitCompactCallLog || emitFullCallLog) {

      const eventMode = emitCompactCallLog ? "compact_success_full_error" : "full";

      const safeBody = eventMode === "full" ? getSafeBody(response, endpoint) : "[response body omitted]";

      try {

        // eslint-disable-next-line no-console

        console.log(

          JSON.stringify(

            buildStepLogEvent({

              mode: eventMode,

              type: "concurrent_step_call",

              flowName: flow.name,

              stepName: step.name,

              stepIndex: p.stepIndex,

              url,

              method: endpoint.method,

              requestBody,

              requestHeaders: config.headers,

              requestParams: endpoint.params,

              timeout: config.timeout,

              checks: checkResults,

              tags: config.tags,

              response: {

                status: response.status,

                headers: response.headers,

                timings: response.timings,

                remote_ip: (response as any).remote_ip,

                remote_port: (response as any).remote_port,

                request_url: (response as any)?.request?.url,

                body: safeBody,

              },

            }),

          ),

        );

      } catch (_e) {

        // eslint-disable-next-line no-console

        console.log(`flow_step_call: ${flow.name} -> ${step.name} status=${response.status}`);

      }

    }



    results.push({

      stepName: step.name,

      stepIndex: p.stepIndex,

      success,

      status: response.status,

      duration: response.timings?.duration,

      checks: checkResults,

      extractedData: Object.keys(step.extractors || {}),

    });



    if (!success) hasFailure = true;

  }



  return { results, hasFailure, maxDelay, nextStepIndex };

}

