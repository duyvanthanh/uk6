import type { FlowStepDefinition, ScenarioPlanBlock, SetupTaskConfig } from "./types.js";



/**

 * Helpers để giữ API cũ và dựng plan blocks.

 *

 * File này chỉ lo typing/IntelliSense và backward compatibility.

 */



/**

 * Helper setup task tương thích ngược.

 *

 * @deprecated Nên dùng {@link createStep} trong `setupTasks` để dùng chung một mô hình cho tất cả step/task.

 */

export function createSetupTask(args: SetupTaskConfig) {

  return args;

}



/**

 * Tạo definition cho step (helper cho IntelliSense).

 *

 * @deprecated Dùng {@link createStep} (cùng hành vi, tên rõ ràng hơn).

 */

export function createFlowStep(args: FlowStepDefinition): FlowStepDefinition {

  return args;

}



/**  Tạo definition cho step (helper cho IntelliSense). */

export function createStep(args: FlowStepDefinition): FlowStepDefinition {

  return args;

}



export function createDbStep(args: any): any {

  if (!args || typeof args !== "object") return args;

  if ((args as any).endpoint) return args;

  if ((args as any).query) return { ...(args as any), endpoint: (args as any).query };

  return args;

}



/** Tạo block plan chạy tuần tự. */

export function flow(steps: FlowStepDefinition[], name?: string): ScenarioPlanBlock {

  return { type: "flow", name, steps };

}



/** Tạo block plan chạy đồng thời (thực thi bằng `http.batch`). */

export function concurrent(steps: FlowStepDefinition[], name?: string): ScenarioPlanBlock {

  return { type: "concurrent", name, steps };

}



/** Tạo block plan setup (chạy 1 lần trong k6 `setup()`). */

export function setups(steps: Array<SetupTaskConfig | FlowStepDefinition>, name?: string): ScenarioPlanBlock {

  return { type: "setup", name, steps };

}



/** Tạo block plan teardown (chạy 1 lần trong k6 `teardown(data)`). */

export function teardowns(steps: Array<SetupTaskConfig | FlowStepDefinition>, name?: string): ScenarioPlanBlock {

  return { type: "teardown", name, steps };

}

