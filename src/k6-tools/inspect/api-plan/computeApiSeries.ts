import type { VuPlan, VuPoint } from '../plan/types.js';



export type ApiSeries = {

    key: string;

    label: string;

    scenario: string;

    phase: 'setup' | 'flow' | 'concurrent' | 'teardown' | 'unknown';

    endpointRef: string | null;

    endpointImportFrom: string | null;

    stepName: string | null;

    points: VuPoint[];

    notes: string[];

};



function normalizePoints(points: VuPoint[]): VuPoint[] {

    const sorted = points

        .filter((p) => Number.isFinite(p.tMs) && Number.isFinite(p.vus))

        .map((p) => ({ tMs: Math.max(0, Math.round(p.tMs)), vus: Math.max(0, Number(p.vus)) }))

        .sort((a, b) => a.tMs - b.tMs);

    const out: VuPoint[] = [];

    for (const p of sorted) {

        const last = out[out.length - 1];

        if (!last || last.tMs !== p.tMs) out.push(p);

        else out[out.length - 1] = p;

    }

    return out;

}



function evalSeriesAt(points: VuPoint[], tMs: number): number {

    if (!points.length) return 0;

    if (tMs <= points[0].tMs) return points[0].vus;

    const last = points[points.length - 1];

    if (tMs >= last.tMs) return last.vus;

    for (let i = 0; i < points.length - 1; i++) {

        const a = points[i];

        const b = points[i + 1];

        if (tMs >= a.tMs && tMs <= b.tMs) {

            const dt = b.tMs - a.tMs;

            if (dt <= 0) return b.vus;

            const r = (tMs - a.tMs) / dt;

            return a.vus + (b.vus - a.vus) * r;

        }

    }

    return 0;

}



/**

 * Tính series “VU kỳ vọng chạm vào từng step” dựa trên:

 * - đường cong VU/time theo scenario (từ `k6 inspect --execution-requirements`)

 * - quy ước gate `load` của Flow (step sau chỉ chạy trên subset VU)

 *

 * Giả định: thứ tự step đúng như thứ tự trong `apiPlan.steps`.

 */

export function computeApiSeries(plan: VuPlan): ApiSeries[] {

    const apiPlan = plan.apiPlan;

    if (!apiPlan || !Array.isArray(apiPlan.steps) || apiPlan.steps.length === 0) return [];



    const series: ApiSeries[] = [];



    // Map scenarioName -> points. Nếu không xác định được scenario thì fallback về total.

    const scenarioMap = new Map<string, VuPoint[]>();

    for (const s of plan.scenarios || []) scenarioMap.set(s.name, s.points || []);

    scenarioMap.set('total', (plan.total && plan.total.points) || []);



    // Lấy các mốc thời gian (breakpoints) từ các curve để sampling đồng bộ.

    const timeSet = new Set<number>();

    for (const pts of scenarioMap.values()) for (const p of pts) timeSet.add(p.tMs);

    const times = Array.from(timeSet).sort((a, b) => a - b);



    const allScenarioNames = (plan.scenarios || []).map((s) => s.name);



    // Expand: mỗi step -> 1 series cho mỗi scenario.

    for (const step of apiPlan.steps as any[]) {

        const stepScenarios = step.scenarios && step.scenarios.length ? step.scenarios : allScenarioNames.length ? allScenarioNames : ['total'];

        for (const scenarioName of stepScenarios) {

            const basePoints = scenarioMap.get(scenarioName) || scenarioMap.get('total') || [];

            const key = `${scenarioName}::${step.stepName || step.endpointRef || 'step'}`;

            // Gating tích luỹ (chỉ áp dụng cho phase=flow) sẽ tính ở pass sau.

            series.push({

                key,

                label: `${scenarioName} / ${step.stepName || step.endpointRef || 'step'}`,

                scenario: scenarioName,

                phase: step.phase || 'unknown',

                endpointRef: step.endpointRef || null,

                endpointImportFrom: step.endpointImportFrom || null,

                stepName: step.stepName || null,

                points: [],

                notes: [],

            });



            (series[series.length - 1] as any).__basePoints = basePoints;

            (series[series.length - 1] as any).__load = step.load == null ? 1 : Math.max(0, Math.min(1, Number(step.load)));

            (series[series.length - 1] as any).__phase = step.phase || 'unknown';

        }

    }



    // Gating tích lũy trên mỗi kịch bản:

    // - `flow` steps: cộng dồn (vì Flow sẽ dừng cả flow nếu load gate chặn)

    // - `concurrent` steps: độc lập từng bước (một bước bị load gate chặn, bước còn lại vẫn chạy)

    const byScenario = new Map<string, ApiSeries[]>();

    for (const s of series) {

        const list = byScenario.get(s.scenario) || [];

        list.push(s);

        byScenario.set(s.scenario, list);

    }



    for (const [scenarioName, list] of byScenario.entries()) {

        let cumulativeFlow = 1;

        for (const s of list) {

            const basePoints: VuPoint[] = (s as any).__basePoints || [];

            const load = Number((s as any).__load);

            const phase: string = (s as any).__phase || 'unknown';



            if (phase === 'setup' || phase === 'teardown') {

                const tMs = phase === 'setup' ? 0 : (plan.totalDurationMs || (times.length ? times[times.length - 1] : 0));

                // Marker line: vẽ theo (0,0)->(t,0)->(t,1)->(t,0) 

                s.points = normalizePoints([

                    { tMs: 0, vus: 0 },

                    { tMs, vus: 0 },

                    { tMs, vus: 1 },

                    { tMs, vus: 0 },

                ]);

                s.notes.push('Setup/teardown runs once (not per VU). Rendered as a marker.');

                delete (s as any).__basePoints;

                delete (s as any).__load;

                delete (s as any).__phase;

                continue;

            }



            if (phase === 'flow') {

                cumulativeFlow *= Number.isFinite(load) ? Math.max(0, Math.min(1, load)) : 1;

                const pts = times.map((tMs) => ({ tMs, vus: evalSeriesAt(basePoints, tMs) * cumulativeFlow }));

                s.points = normalizePoints(pts);

                if (cumulativeFlow < 1) s.notes.push(`Derived via sequential load gating (cumulative=${cumulativeFlow.toFixed(4)}).`);

            } else {

                // concurrent/unknown: gate không cộng dồn

                const factor = Number.isFinite(load) ? Math.max(0, Math.min(1, load)) : 1;

                const pts = times.map((tMs) => ({ tMs, vus: evalSeriesAt(basePoints, tMs) * cumulativeFlow * factor }));

                s.points = normalizePoints(pts);

                if (factor < 1) s.notes.push(`Derived via concurrent/independent load gating (factor=${factor.toFixed(4)}).`);

            }

            delete (s as any).__basePoints;

            delete (s as any).__load;

            delete (s as any).__phase;

        }

    }



    return series;

}

