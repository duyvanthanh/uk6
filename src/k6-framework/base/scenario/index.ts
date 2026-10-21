import type { ScenarioArgs } from "./types.js";

import { compilePlan } from "./plan-compile.js";

import { buildAndRunFlow, createFlowFromPlan, runOnceTasks } from "./execute.js";



export * from "./types.js";

export * from "./compat.js";



/**

 * Tạo scenario cho k6 theo 3 hàm export: `setup()` / `runScenario()` / `teardown()`.

 *

 * Triển khai:

 * - `plan-compile`: normalize + validate thứ tự setup/teardown.

 * - `execute`: chạy setup/teardown một lần, chạy Flow cho mỗi iteration.

 * - `compat`: giữ helper API cũ (không breaking import).

 */

export function createScenario({

  flowName,

  setupTasks = [],

  teardownTasks = [],

  flowSteps = [],

  concurrentSteps = [],

  plan,

  logFailures = true,

}: ScenarioArgs) {

  const name = flowName || "Unnamed Flow";



  const compiled = compilePlan({ flowSteps, concurrentSteps, plan });

  let cachedFlow: any = null;



  function setup() {

    return runOnceTasks([...setupTasks, ...compiled.plannedSetupTasks], {}, { flowName: name, phase: "setup" });

  }



  function teardown(setupData: any = {}) {

    runOnceTasks([...teardownTasks, ...compiled.plannedTeardownTasks], setupData, { flowName: name, phase: "teardown" });

  }



  function runScenario(setupData: any = {}, planLabel = "unknown") {

    if (!cachedFlow) {

      cachedFlow = createFlowFromPlan(name, compiled.runPlan as any);

    }

    buildAndRunFlow({

      flowName: name,

      setupData,

      runPlan: compiled.runPlan as any,

      planLabel,

      logFailures,

      cachedFlow,

    });

  }



  return { setup, runScenario, teardown };

}

