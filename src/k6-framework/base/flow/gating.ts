import exec from "k6/execution";



/** @internal xác minh hiệu số load */

export function normalizeLoad(load: any, stepName?: string) {

  if (load == null) return 1;



  if (typeof load !== "number" || !Number.isFinite(load)) {

    throw new Error(`Invalid load for step "${stepName || "unknown"}": expected a number between 0 and 1.`);

  }



  if (load < 0 || load > 1) {

    throw new Error(`Invalid load for step "${stepName || "unknown"}": ${load}. Expected 0 <= load <= 1.`);

  }



  return load;

}



/**  @internal Hash FNV-1a 32-bit */

export function fnv1a32(input: string) {

  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {

    hash ^= input.charCodeAt(i);

    hash = (hash * 0x01000193) >>> 0;

  }

  return hash >>> 0;

}



export function getExactLoadState() {

  const vu = typeof __VU !== "undefined" ? (__VU as any) : 0;

  const iter = typeof __ITER !== "undefined" ? (__ITER as any) : 0;

  const scenario =

    exec && (exec as any).scenario && typeof (exec as any).scenario === "object" ? (exec as any).scenario : null;

  const scenarioVUsRaw =

    scenario && typeof scenario.vus === "number" && Number.isFinite(scenario.vus)

      ? scenario.vus

      : scenario && typeof scenario.vusMax === "number" && Number.isFinite(scenario.vusMax)

        ? scenario.vusMax

        : scenario && typeof scenario.maxVUs === "number" && Number.isFinite(scenario.maxVUs)

          ? scenario.maxVUs

          : null;

  const scenarioVUs = scenarioVUsRaw != null ? Math.max(0, Math.floor(scenarioVUsRaw)) : null;



  const activeVUs =

    exec &&

    (exec as any).instance &&

    typeof (exec as any).instance.vusActive === "number" &&

    Number.isFinite((exec as any).instance.vusActive)

      ? Math.max(0, Math.floor((exec as any).instance.vusActive))

      : null;



  const initializedVUs =

    exec &&

    (exec as any).instance &&

    typeof (exec as any).instance.vusInitialized === "number" &&

    Number.isFinite((exec as any).instance.vusInitialized)

      ? Math.max(0, Math.floor((exec as any).instance.vusInitialized))

      : null;



  const totalVUs =

    scenarioVUs != null && scenarioVUs > 0 ? scenarioVUs : initializedVUs != null && initializedVUs > 0 ? initializedVUs : activeVUs;



  return { totalVUs, vu, iter };

}



/**  @internal Deterministic decision dựa trên (VU, ITER, stepIndex). */

export function shouldRunStepByLoad(

  step: any,

  stepIndex: number,

  exactLoadState?: { totalVUs: number | null; vu: number; iter: number } | null,

) {

  const load = normalizeLoad(step?.load, step?.name);

  if (load >= 1) return true;

  if (load <= 0) return false;



  const loadMode = (step?.loadMode || "probabilistic") as "probabilistic" | "exact";

  const state = exactLoadState || getExactLoadState();

  const vu = state.vu;

  const iter = state.iter;



  if (loadMode === "exact") {

    const totalVUs = state.totalVUs;



    if (totalVUs == null || totalVUs <= 0 || !Number.isFinite(vu) || vu <= 0) {

      // Fallback về probabilistic gate nếu không xác định được active VUs

      const seed = `${vu}:${iter}:${stepIndex}`;

      const bucket = (fnv1a32(seed) % 10000) / 10000;

      return bucket < load;

    }



    // Exact count (best-effort): chạy bước cho K active VUs đầu tiên

    const k = Math.max(0, Math.min(totalVUs, Math.round(load * totalVUs)));

    return vu <= k;

  }



  const seed = `${vu}:${iter}:${stepIndex}`;

  const bucket = (fnv1a32(seed) % 10000) / 10000;

  return bucket < load;

}



