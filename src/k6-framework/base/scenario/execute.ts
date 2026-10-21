import { check } from "k6";

import { Flow } from "../flow/index.js";

import { parseJsonSafe, pickFirst } from "../../utils/response-utils.js";

import { httpRequest } from "../http-request.js";

import { sqlRequest } from "../sql-request.js";

import { applyExtractors } from "../extractors.js";

import { serializeError } from "../flow/telemetry.js";

import {

  buildStepLogEvent,

  getStepLoggingMode,

  shouldEmitCompactCallEvent,

  shouldEmitFullCallEvent,

  shouldEmitFullErrorEvent,

  shouldLogExceptions,

} from "../logging.js";

import type { FlowStepDefinition, ScenarioPlanBlock, SetupTaskConfig } from "./types.js";



/**  @internal Resolve endpoint: nhận instance hoặc factory `(ctx) => instance`. */

export function resolveEndpoint(factoryOrInstance: any, ctx: any) {

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



export function resolveStepEndpoint(stepLike: any, ctx: any) {

  if (stepLike && typeof stepLike === "object") {

    const candidate = (stepLike as any).endpoint ?? (stepLike as any).query;

    return resolveEndpoint(candidate, ctx);

  }

  return resolveEndpoint(stepLike, ctx);

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



export function runOnceTasks(

  tasks: Array<SetupTaskConfig | FlowStepDefinition>,

  initialCtx: any,

  meta?: { flowName?: string; phase?: "setup" | "teardown" | "unknown" },

) {

  const ctx: any = { ...(initialCtx || {}) };

  const flowName = meta?.flowName || "Unnamed Flow";

  const phase = meta?.phase || "unknown";

  const callType = phase === "setup" ? "setup_call" : phase === "teardown" ? "teardown_call" : "flow_step_call";

  const errorType = phase === "setup" ? "setup_error" : phase === "teardown" ? "teardown_error" : "flow_step_error";

  const exceptionType =

    phase === "setup" ? "setup_exception" : phase === "teardown" ? "teardown_exception" : "flow_step_exception";



  tasks.forEach((task: any, taskIndex: number) => {

    const stepName = task?.name || "unnamed_task";

    const stepIndex = taskIndex;



    try {

      let endpoint = resolveStepEndpoint(task, ctx);



      if (task.preprocessor) {

        const usesEndpointArg = task.preprocessor.length > 1;

        const nextEndpoint = usesEndpointArg ? task.preprocessor(endpoint, ctx) : task.preprocessor(ctx);

        if (

          isEndpointHandle(nextEndpoint) &&

          task.endpoint &&

          nextEndpoint.__mb_factory === task.endpoint &&

          endpoint &&

          typeof endpoint.resetToBase === "function" &&

          typeof (task.endpoint as any).__mb_apply_cached_overrides === "function"

        ) {

          endpoint.resetToBase();

          endpoint = (task.endpoint as any).__mb_apply_cached_overrides(endpoint, nextEndpoint.__mb_options);

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

        throw new Error(`Invalid endpoint in task "${stepName}". Expected EndpointModel-like object.`);

      }



      const url = endpoint.getUrl();

      const config = endpoint.getRequestConfig();

      const method = String(endpoint.method || "GET").toUpperCase();

      const requestBody = ["POST", "PUT", "PATCH"].includes(method) ? config.body : undefined;



      const protocol = (endpoint as any).protocol;

      const isSql = protocol === "sql" || method === "SQL";

      const res = isSql ? sqlRequest(endpoint, config) : httpRequest(method, url, requestBody, config);

      const data = parseJsonSafe(res.body) || {};



      const checkResults: Record<string, boolean> = {};

      if (task.checks && task.checks.length > 0) {

        task.checks.forEach((checkConfig: any) => {

          const checkName = checkConfig.name || "unnamed_check";

          const cond = checkConfig.condition;

          const ok = check(res, {

            [checkName]: (r: any) => (typeof cond === "function" && cond.length >= 2 ? cond(r, data, ctx) : cond(r)),

          });

          checkResults[checkName] = ok;

        });

      }



      const extracted: any = {};

      applyExtractors(extracted, task.extractors as any, res, data, { label: stepName });



      let onResponseResult: any = null;

      if (typeof task.onResponse === "function") {

        onResponseResult = task.onResponse(res, data);

      } else if (Array.isArray(task.sessionPaths) && task.sessionPaths.length > 0) {

        const sessionId = pickFirst(data, task.sessionPaths);

        if (!sessionId) {

          throw new Error(`Missing sessionId in task "${stepName}". Status: ${res?.status}`);

        }

        onResponseResult = { sessionId, setupResponse: data };

      } else {

        onResponseResult = { [stepName]: data };

      }



      Object.assign(ctx, onResponseResult, extracted);



      runPostprocessor(task.postprocessor, res, ctx);



      const success = isSql ? res.status === 0 : res.status >= 200 && res.status < 300;

      const hasFailedCheck = Object.values(checkResults).some((ok) => ok === false);

      const stepLoggingMode = getStepLoggingMode();

      const emitCompactCallLog = shouldEmitCompactCallEvent({ mode: stepLoggingMode, success, failedCheck: hasFailedCheck });

      const emitFullCallLog = shouldEmitFullCallEvent({ mode: stepLoggingMode, success, failedCheck: hasFailedCheck });

      const emitErrorLog = shouldEmitFullErrorEvent({ mode: stepLoggingMode, success, failedCheck: hasFailedCheck });

      const mergedTags = { ...(config.tags || {}), phase, endpoint: ((config.tags as any) || {}).endpoint || url };



      if (emitErrorLog) {

        const shouldLogBody =

          typeof (endpoint as any)?.logResponseBody === "boolean" ? (endpoint as any).logResponseBody : true;

        const safeBody = shouldLogBody ? res.body : "[response body omitted]";

        try {

          console.error(

            JSON.stringify(

              buildStepLogEvent({

                mode: stepLoggingMode,

                type: errorType,

                flowName,

                stepName,

                stepIndex,

                status: res.status,

                url,

                method: endpoint.method,

                requestBody,

                requestHeaders: config.headers,

                requestParams: endpoint.params,

                timeout: config.timeout,

                checks: checkResults,

                tags: mergedTags,

                response: {

                  status: res.status,

                  headers: res.headers,

                  timings: res.timings,

                  remote_ip: (res as any).remote_ip,

                  remote_port: (res as any).remote_port,

                  request_url: (res as any)?.request?.url,

                  body: safeBody,

                },

              }),

            ),

          );

        } catch (_e) {

          // eslint-disable-next-line no-console 

          console.error(`${errorType}: ${flowName} -> ${stepName} status=${res.status}`);

        }

      }



      if (emitCompactCallLog || emitFullCallLog) {

        const eventMode = emitCompactCallLog ? "compact_success_full_error" : "full";

        const shouldLogBody =

          eventMode === "full" &&

          (typeof (endpoint as any)?.logResponseBody === "boolean" ? (endpoint as any).logResponseBody : true);

        const safeBody = shouldLogBody ? res.body : "[response body omitted]";

        try {

          // eslint-disable-next-line no-console 

          console.log(

            JSON.stringify(

              buildStepLogEvent({

                mode: eventMode,

                type: callType,

                flowName,

                stepName,

                stepIndex,

                url,

                method: endpoint.method,

                requestBody,

                requestHeaders: config.headers,

                requestParams: endpoint.params,

                timeout: config.timeout,

                checks: checkResults,

                tags: mergedTags,

                response: {

                  status: res.status,

                  headers: res.headers,

                  timings: res.timings,

                  remote_ip: (res as any).remote_ip,

                  remote_port: (res as any).remote_port,

                  request_url: (res as any)?.request?.url,

                  body: safeBody,

                },

              }),

            ),

          );

        } catch (_e) {

          // eslint-disable-next-line no-console 

          console.log(`${callType}: ${flowName} -> ${stepName} status=${res.status}`);

        }

      }

    } catch (error: any) {

      if (shouldLogExceptions(getStepLoggingMode())) {

        console.error(

          JSON.stringify({

            type: exceptionType,

            flowName,

            stepName,

            stepIndex,

            tags: { phase },

            error: serializeError(error),

          }),

        );

      }

      throw error;

    }

  });



  return ctx;

}



export function buildAndRunFlow({

  flowName,

  setupData,

  runPlan,

  planLabel,

  logFailures,

  cachedFlow,

}: {

  flowName: string;

  setupData: any;

  runPlan: ScenarioPlanBlock[];

  planLabel: string;

  logFailures: boolean;

  cachedFlow?: Flow | null;

}) {

  const flow = cachedFlow || createFlowFromPlan(flowName, runPlan);

  flow.globalData = {};

  const result = flow.execute({ ...setupData });



  if (logFailures) {

    const failures = result.results.filter((r: any) => r && r.success === false);

    if (failures.length > 0) {

      const label = planLabel || "unknown";

      // eslint-disable-next-line no-console 

      console.log(`[${label}] Failures: ${failures.map((f: any) => `${f.stepName} (${f.status})`).join(", ")}`);

    }

  }

}



export function createFlowFromPlan(flowName: string, runPlan: ScenarioPlanBlock[]) {

  const flow = new Flow(flowName || "Unnamed Flow", { continueOnFailure: false, delayBetweenSteps: 0 });



  runPlan.forEach((block: ScenarioPlanBlock) => {

    const steps = Array.isArray((block as any).steps) ? (block as any).steps : [];

    if (steps.length === 0) return;



    if (block.type === "concurrent") {

      flow.addConcurrentGroup({

        name: (block as any).name || "concurrent",

        steps: steps.map((stepDef: any) => ({

          name: stepDef.name,

          endpoint: (stepDef as any).endpoint ?? (stepDef as any).query,

          load: stepDef.load,

          loadMode: stepDef.loadMode,

          checks: stepDef.checks,

          thresholds: stepDef.thresholds,

          extractors: stepDef.extractors,

          preprocessor: stepDef.preprocessor,

          postprocessor: stepDef.postprocessor,

          delay: stepDef.delay,

          skipOn: stepDef.skipOn,

        })),

      });

      return;

    }



    if (block.type === "setup" || block.type === "teardown") return;



    steps.forEach((stepDef: any) => {

      flow.addStep({

        name: stepDef.name,

        endpoint: (stepDef as any).endpoint ?? (stepDef as any).query,

        load: stepDef.load,

        loadMode: stepDef.loadMode,

        checks: stepDef.checks,

        thresholds: stepDef.thresholds,

        extractors: stepDef.extractors,

        preprocessor: stepDef.preprocessor,

        postprocessor: stepDef.postprocessor,

        delay: stepDef.delay,

        skipOn: stepDef.skipOn,

      });

    });

  });



  return flow;

}

