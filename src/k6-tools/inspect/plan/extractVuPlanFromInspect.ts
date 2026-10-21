import { parseK6DurationToMs } from './duration.js';

import type { ScenarioVuSeries, VuPlan, VuPoint } from './types.js';



function toNonNegInt(n: any): number {

    const v = Number(n);

    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;

}



function normalizePoints(points: VuPoint[]): VuPoint[] {

    const sorted = points

        .filter((p) => Number.isFinite(p.tMs) && Number.isFinite(p.vus))

        .map((p) => ({ tMs: Math.max(0, Math.round(p.tMs)), vus: Math.max(0, Number(p.vus)) }))

        .sort((a, b) => a.tMs - b.tMs);



    const dedup: VuPoint[] = [];

    for (const p of sorted) {

        const last = dedup[dedup.length - 1];

        if (!last || last.tMs !== p.tMs) dedup.push(p);

        else dedup[dedup.length - 1] = p;

    }

    return dedup;

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

            const ratio = (tMs - a.tMs) / dt;

            return a.vus + (b.vus - a.vus) * ratio;

        }

    }

    return 0;

}



function buildConstantSeries(opts: {

    name: string;

    executor: string;

    startTimeMs: number;

    durationMs: number;

    vus: number;

}): ScenarioVuSeries {

    const start = Math.max(0, Math.round(opts.startTimeMs));

    const end = Math.max(start, Math.round(start + Math.max(0, opts.durationMs)));

    const v = Math.max(0, opts.vus);

    // Điểm rơi 0 không ghi đè điểm cuối

    // Bình thường --inspect của k6 ghi lại điểm cuối của plan, nhưng sẽ thêm 1 điểm cuối để vẽ đường giảm về 0

    const points = normalizePoints([

        { tMs: start, vus: v },

        { tMs: end, vus: v },

        { tMs: end + 1, vus: 0 },

    ]);

    return { name: opts.name, executor: opts.executor, startTimeMs: start, endTimeMs: end, points };

}



function buildRampingVusSeries(opts: {

    name: string;

    executor: string;

    startTimeMs: number;

    startVUs: number;

    stages: Array<{ duration: any; target: any }>;

}): ScenarioVuSeries {

    const start = Math.max(0, Math.round(opts.startTimeMs));

    let t = start;

    let current = Math.max(0, Number(opts.startVUs || 0));

    const points: VuPoint[] = [{ tMs: t, vus: current }];



    for (const stage of opts.stages || []) {

        const d = Math.max(0, parseK6DurationToMs(stage.duration));

        t += d;

        current = Math.max(0, Number(stage.target || 0));

        points.push({ tMs: t, vus: current });

    }

    // Tương tự constant-vus: không ghi đè điểm cuối.

    points.push({ tMs: t + 1, vus: 0 });



    const norm = normalizePoints(points);

    const end = norm.length ? norm[norm.length - 1].tMs : start;

    return { name: opts.name, executor: opts.executor, startTimeMs: start, endTimeMs: end, points: norm };

}



export function extractVuPlanFromInspect(inspectJson: any): VuPlan {

    const scenariosObj = (inspectJson && inspectJson.scenarios) || {};

    const scenarioNames = Object.keys(scenariosObj);

    const notes: string[] = [];



    const totalDurationMs = parseK6DurationToMs(inspectJson && inspectJson.totalDuration);

    const maxVUs = inspectJson && typeof inspectJson.maxVUs === 'number' ? inspectJson.maxVUs : null;



    const scenarios: ScenarioVuSeries[] = [];



    for (const name of scenarioNames) {

        const s = scenariosObj[name] || {};

        const executor = String(s.executor || 'unknown');

        const startTimeMs = parseK6DurationToMs(s.startTime);



        if (executor === 'ramping-vus') {

            scenarios.push(

                buildRampingVusSeries({

                    name,

                    executor,

                    startTimeMs,

                    startVUs: toNonNegInt(s.startVUs),

                    stages: Array.isArray(s.stages) ? s.stages : [],

                })

            );

            continue;

        }



        if (executor === 'constant-vus') {

            scenarios.push(

                buildConstantSeries({

                    name,

                    executor,

                    startTimeMs,

                    durationMs: parseK6DurationToMs(s.duration),

                    vus: toNonNegInt(s.vus),

                })

            );

            continue;

        }



        if (executor === 'per-vu-iterations' || executor === 'shared-iterations') {

            const durationMs = parseK6DurationToMs(s.maxDuration) || totalDurationMs;

            scenarios.push(

                buildConstantSeries({

                    name,

                    executor,

                    startTimeMs,

                    durationMs,

                    vus: toNonNegInt(s.vus),

                })

            );

            if (!parseK6DurationToMs(s.maxDuration)) {

                notes.push(`Scenario "${name}" (${executor}) has no maxDuration; used totalDuration as an upper bound.`);

            }

            continue;

        }



        if (executor === 'constant-arrival-rate' || executor === 'ramping-arrival-rate') {

            const durationMs =

                parseK6DurationToMs(s.duration) ||

                (Array.isArray(s.stages)

                    ? s.stages.reduce((acc: number, st: any) => acc + parseK6DurationToMs(st.duration), 0)

                    : 0) ||

                totalDurationMs;

            const pre = toNonNegInt(s.preAllocatedVUs);

            const max = toNonNegInt(s.maxVUs) || pre;

            scenarios.push(

                buildConstantSeries({

                    name,

                    executor,

                    startTimeMs,

                    durationMs,

                    vus: Math.max(pre, max),

                })

            );

            notes.push(`Scenario "${name}" (${executor}) uses arrival-rate; VU line shows a ceiling, not actual usage.`);

            continue;

        }



        if (typeof s.vus === 'number') {

            scenarios.push(

                buildConstantSeries({

                    name,

                    executor,

                    startTimeMs,

                    durationMs: totalDurationMs,

                    vus: toNonNegInt(s.vus),

                })

            );

            notes.push(`Scenario "${name}" uses unsupported executor "${executor}". Rendered as constant VUs.`);

        } else {

            notes.push(`Scenario "${name}" uses unsupported executor "${executor}" and has no VUs; skipped.`);

        }

    }



    const breakpoints = new Set<number>();

    for (const s of scenarios) for (const p of s.points) breakpoints.add(p.tMs);

    if (totalDurationMs > 0) breakpoints.add(Math.round(totalDurationMs));



    const times = Array.from(breakpoints).sort((a, b) => a - b);

    const totalPoints: VuPoint[] = times.map((tMs) => {

        let sum = 0;

        for (const s of scenarios) sum += evalSeriesAt(s.points, tMs);

        return { tMs, vus: sum };

    });



    return {

        generatedAtEpochMs: Date.now(),

        totalDurationMs: totalDurationMs || (times.length ? times[times.length - 1] : 0),

        maxVUs,

        scenarios,

        total: { points: normalizePoints(totalPoints) },

        notes,

    };

}



