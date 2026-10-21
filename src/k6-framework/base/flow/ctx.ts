import { applyExtractors } from "../extractors.js";

import type { FlowRuntime } from "./types.js";



/**

 * Quy ước ctx (globalData) của Flow:

 * - extractors ghi thẳng vào ctx; trùng key thì overwrite

 */

export function applyStepExtractors(

  flow: FlowRuntime,

  step: any,

  response: any,

  parsedDataOrGetter?: any | (() => any),

) {

  if (!step.extractors || Object.keys(step.extractors).length === 0) return;

  applyExtractors(flow.globalData, step.extractors, response, parsedDataOrGetter, { label: step.name });

}

