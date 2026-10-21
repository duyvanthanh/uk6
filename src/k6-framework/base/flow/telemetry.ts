import exec from "k6/execution";

import { getStepLoggingMode, shouldLogVuChanges } from "../logging.js";



/**

 * Module riêng cho log/telemetry để:

 * - Flow/Scenario code tập trung vào logic chạy step

 * - format log JSON nhất quán cho dashboard/tooling

 */



let lastObservedActiveVUs: number | null = null;



/** @internal Serialize error để log JSON (tránh circular). */

export function serializeError(error: any) {

  if (!error) return null;

  return {

    name: error.name || "Error",

    message: error.message || String(error),

    stack: error.stack || null,

  };

}



/**

 * @internal Log số VU active khi thay đổi (chỉ VU=1) để dễ quan sát ramp-up/ramp-down.

 *

 * Mỗi VU log khi nó quan sát thay đổi, vì với ramping stages VU 1 không

 * nhất thiết chạy đúng lúc chuyển target; nếu chỉ dựa vào VU 1 thì dashboard

 * VU/time có thể bị giữ ở 0 hoặc cập nhật trễ.

 */

export function logVuChangeIfNeeded() {

  if (!shouldLogVuChanges(getStepLoggingMode())) return;



  const activeVUs =

    exec &&

    (exec as any).instance &&

    typeof (exec as any).instance.vusActive === "number" &&

    Number.isFinite((exec as any).instance.vusActive)

      ? (exec as any).instance.vusActive

      : null;



  if (activeVUs == null || activeVUs === lastObservedActiveVUs) return;



  const previousActiveVUs = lastObservedActiveVUs;

  lastObservedActiveVUs = activeVUs;



  // eslint-disable-next-line no-console 

  console.log(

    JSON.stringify({

      type: "vu_change",

      previousActiveVUs,

      activeVUs,

      observedByVu: __VU || null,

      iteration: __ITER || 0,

    }),

  );

}



