import { sleep } from "k6";

import { logVuChangeIfNeeded, serializeError } from "./telemetry.js";

import { executeConcurrentGroup, executeStep } from "./execute.js";

import { getExactLoadState, normalizeLoad, shouldRunStepByLoad } from "./gating.js";

import type { FlowConcurrentGroupConfig, FlowEntry, FlowExecuteResult, FlowOptions, FlowStepConfig } from "./types.js";



/**

 * Flow chạy danh sách step trong 1 VU/iteration.

 *

 * Ghi chú k6:

 * - Mỗi VU có JS runtime riêng, state trong Flow là per‑VU.

 * - `loadMode` dùng gate deterministic theo (__VU, __ITER, stepIndex).

 */

export class Flow {

  name: string;

  steps: FlowEntry[];

  globalData: Record<string, any>;

  options: any;



  constructor(name: string, options: FlowOptions = {}) {

    this.name = name;

    this.steps = [];

    this.globalData = {};

    this.options = {

      continueOnFailure: options.continueOnFailure || false,

      delayBetweenSteps: options.delayBetweenSteps || 0,

      ...options,

    };

  }



  /**

   * Thêm 1 step vào flow

   *

   * @param stepConfig Cấu hình step (endpoint/checks/extractors...).

   * @returns `this` để chain.

   */

  addStep(stepConfig: FlowStepConfig) {

    const step = {

      type: "step",

      name: stepConfig.name,

      endpoint: stepConfig.endpoint,

      load: normalizeLoad(stepConfig.load, stepConfig.name),

      loadMode: (stepConfig.loadMode || "probabilistic") as "probabilistic" | "exact",

      checks: stepConfig.checks || [],

      thresholds: (stepConfig as any).thresholds || [],

      extractors: stepConfig.extractors || {},

      preprocessor: stepConfig.preprocessor || null,

      postprocessor: stepConfig.postprocessor || null,

      skipOn: stepConfig.skipOn || null,

      delay: stepConfig.delay || 0,

    } as any;



    this.steps.push(step);

    return this;

  }



  /**

   * Thêm nhóm bước thực hiện song song (cho từng VU/iteration) bằng `http.batch`.

   *

   * Quy ước ctx:

   * - các step dùng chung `globalData`.

   * - extractors ghi trực tiếp vào ctx; trùng key thì step chạy sau overwrite.

   */

  addConcurrentGroup(groupConfig: FlowConcurrentGroupConfig) {

    const invalid = (groupConfig.steps || []).find((s: any) => {

      const e = s?.endpoint;

      const proto = e && typeof e === "object" ? (e as any).protocol : null;

      return proto && proto !== "http";

    });

    if (invalid) {

      throw new Error(

        `Concurrent group only supports HTTP endpoints (http.batch). Found protocol="${(invalid as any).endpoint?.protocol}" in step "${invalid.name}".`,

      );

    }



    const groupSteps = (groupConfig.steps || []).map((s) => ({

      type: "step",

      name: s.name,

      endpoint: s.endpoint,

      load: normalizeLoad(s.load, s.name),

      loadMode: (s.loadMode || "probabilistic") as "probabilistic" | "exact",

      checks: s.checks || [],

      thresholds: (s as any).thresholds || [],

      extractors: s.extractors || {},

      preprocessor: s.preprocessor || null,

      postprocessor: s.postprocessor || null,

      skipOn: s.skipOn || null,

      delay: s.delay || 0,

    }));



    this.steps.push({

      type: "concurrent_group",

      name: groupConfig.name || "concurrent_group",

      steps: groupSteps,

    } as any);

    return this;

  }



  /**

   * Chạy flow cho iteration hiện tại.

   *

   * - có `skipOn` nếu có

   * - Chạy preprocessor -> request -> checks -> extractors -> postprocessor

   * - Log JSON có cấu trúc ra stdout/stderr để parse/generate dashboard

   */

  execute(userData: Record<string, any> = {}): FlowExecuteResult {

    this.globalData = { ...this.globalData, ...userData };

    const results: any[] = [];

    (this as any).exactLoadState = getExactLoadState();

    logVuChangeIfNeeded();



    const totalSteps = this.steps.reduce((sum: number, entry: any) => {

      if (entry?.type === "concurrent_group") return sum + (Array.isArray(entry.steps) ? entry.steps.length : 0);

      return sum + 1;

    }, 0);



    let stepIndexCounter = 0;

    let stoppedByLoad = false;

    let stopAtStepIndex: number | null = null;



    for (let i = 0; i < this.steps.length; i++) {

      const entry = this.steps[i];



      try {

        if (entry.type === "concurrent_group") {

          const groupResult = executeConcurrentGroup(this as any, entry, stepIndexCounter);

          stepIndexCounter = groupResult.nextStepIndex;

          results.push(...groupResult.results);



          if (groupResult.hasFailure && !this.options.continueOnFailure) {

            // eslint-disable-next-line no-console 

            console.log(`Flow stopped at concurrent group ${i + 1}: ${entry.name} due to failure`);

            break;

          }



          if (groupResult.maxDelay > 0) {

            sleep(groupResult.maxDelay);

          } else if (this.options.delayBetweenSteps > 0) {

            sleep(this.options.delayBetweenSteps);

          }

          continue;

        }



        const step = entry;

        const currentStepIndex = stepIndexCounter;

        stepIndexCounter += 1;



        if (!this.shouldRunStepByLoad(step, currentStepIndex)) {

          stoppedByLoad = true;

          stopAtStepIndex = currentStepIndex;

          break;

        }



        if (step.skipOn && step.skipOn(this.globalData)) {

          continue;

        }



        const result = executeStep(this as any, step, currentStepIndex);

        results.push(result);



        if (!result.success && !this.options.continueOnFailure) {

          // eslint-disable-next-line no-console

          console.log(`Flow stopped at step ${currentStepIndex + 1}: ${step.name} due to failure`);

          break;

        }



        if (step.delay > 0) {

          sleep(step.delay);

        } else if (this.options.delayBetweenSteps > 0) {

          sleep(this.options.delayBetweenSteps);

        }

      } catch (error: any) {

        console.error(

          JSON.stringify({

            type: "flow_step_exception",

            flowName: this.name,

            stepName: entry?.name,

            stepIndex: stepIndexCounter,

            error: serializeError(error),

          }),

        );

        results.push({

          stepName: entry?.name,

          success: false,

          error: error?.message,

        });



        if (!this.options.continueOnFailure) break;

      }

    }



    return {

      flowName: this.name,

      totalSteps: stoppedByLoad ? results.length : totalSteps,

      executedSteps: results.length,

      successfulSteps: results.filter((r) => r.success).length,

      results,

      globalData: this.globalData,

      stoppedByLoad,

      stopAtStepIndex,

    };

  }



  /** @internal xác minh hiệu số load */

  normalizeLoad(load: any, stepName?: string) {

    return normalizeLoad(load, stepName);

  }



  /**  @internal Deterministic decision dựa trên (VU, ITER, stepIndex). */

  shouldRunStepByLoad(step: any, stepIndex: number) {

    return shouldRunStepByLoad(step, stepIndex, (this as any).exactLoadState || null);

  }



  /**  @internal Extract 1 dot-path từ JSON body response. */

  setGlobalData(key: string, value: any) {

    this.globalData[key] = value;

    return this;

  }



  getGlobalData(key?: string) {

    return key ? this.globalData[key] : this.globalData;

  }

}



export type { FlowConcurrentGroupConfig, FlowStepConfig } from "./types.js";

