import type { ScenarioPlanBlock, ScenarioPlanItem } from "./types.js";



export type CompiledPlan = {

  normalizedPlan: ScenarioPlanBlock[];

  plannedSetupTasks: Array<any>;

  plannedTeardownTasks: Array<any>;

  runPlan: Array<Exclude<ScenarioPlanBlock, { type: "setup" } | { type: "teardown" }>>;

};



export function validatePlanPlacement(blocks: ScenarioPlanBlock[]) {

  type Phase = "start" | "run" | "teardown";

  let phase: Phase = "start";



  for (let index = 0; index < blocks.length; index += 1) {

    const block = blocks[index] as any;



    if (block.type === "setup") {

      if (phase !== "start") {

        throw new Error(

          `Invalid plan: setups(...) must be at the beginning (legacy alias: setup(...)). Found setup block at index ${index}.`,

        );

      }

      continue;

    }



    if (block.type === "teardown") {

      phase = "teardown";

      continue;

    }



    if (phase === "teardown") {

      throw new Error(

        `Invalid plan: teardowns(...) must be at the end (legacy alias: teardown(...)). Found "${block.type}" block after teardown at index ${index}.`,

      );

    }



    phase = "run";

  }

}



export function compilePlan({

  flowSteps = [],

  concurrentSteps = [],

  plan,

}: {

  flowSteps?: any[];

  concurrentSteps?: any[];

  plan?: ScenarioPlanItem[] | undefined;

}): CompiledPlan {

  const defaultPlan: ScenarioPlanItem[] = [

    { type: "flow", name: "flowSteps", steps: flowSteps || [] },

    { type: "concurrent", name: "concurrentSteps", steps: concurrentSteps || [] },

  ];



  const providedPlan: ScenarioPlanItem[] = plan && Array.isArray(plan) ? plan : defaultPlan;



  const normalizedPlan: ScenarioPlanBlock[] = providedPlan.map((item: ScenarioPlanItem) => {

    if (Array.isArray(item)) return { type: "flow", steps: item };

    return item;

  });



  validatePlanPlacement(normalizedPlan);



  const plannedSetupTasks = normalizedPlan.flatMap((block) => (block.type === "setup" ? block.steps : []));

  const plannedTeardownTasks = normalizedPlan.flatMap((block) => (block.type === "teardown" ? block.steps : []));

  const runPlan = normalizedPlan.filter((block) => block.type !== "setup" && block.type !== "teardown") as any;



  return { normalizedPlan, plannedSetupTasks, plannedTeardownTasks, runPlan };

}



