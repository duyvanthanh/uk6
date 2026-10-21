import { toApiCall } from "./toApiCall.js";

import { computeDurationStats } from "../utils/stats.js";



/** @internal Gom nhóm các call theo endpoint/method và tính thống kê. */

export function aggregateApiCalls(entries: any) {

    const rawApiCalls = entries.map(toApiCall).filter(Boolean);

    const calls = rawApiCalls.filter((c: any) => typeof c.rawType === 'string' && c.rawType.endsWith('_call'));

    const errors = rawApiCalls.filter((c: any) => typeof c.rawType === 'string' && c.rawType.endsWith('_error'));

    const callKeys = new Set(calls.map((c: any) => c.attemptKey));

    const additionalErrors = errors.filter((e: any) => !callKeys.has(e.attemptKey));

    const apiCalls = calls.concat(additionalErrors);



    let globalMinTs = null;

    let globalMaxTs = null;

    const grouped = new Map();



    for (const call of apiCalls) {

        if (!grouped.has(call.key)) {

            grouped.set(call.key, {

                key: call.key,

                method: call.method,

                endpoint: call.endpoint,

                stepName: call.stepName,

                sampleRemoteAddress: call.remoteAddress || null,

                total: 0,

                errors: 0,

                durations: [],

                statuses: {},

                statusesDetail: {},

                phases: { setup: 0, teardown: 0, flow: 0, other: 0 }

            });

        }

        const bucket = grouped.get(call.key);

        if (!bucket.sampleRemoteAddress && call.remoteAddress) bucket.sampleRemoteAddress = call.remoteAddress;

        bucket.total += 1;

        if (call.isError) bucket.errors += 1;

        if (call.duration != null) bucket.durations.push(call.duration);



        const rt = typeof call.rawType === "string" ? call.rawType : "";

        if (rt.startsWith("setup_")) bucket.phases.setup += 1;

        else if (rt.startsWith("teardown_")) bucket.phases.teardown += 1;

        else if (rt.startsWith("flow_step_")) bucket.phases.flow += 1;

        else bucket.phases.other += 1;

        const statusKey = String(call.status);

        bucket.statuses[statusKey] = (bucket.statuses[statusKey] || 0) + 1;

        if (!bucket.statusesDetail[statusKey]) {

            bucket.statusesDetail[statusKey] = {

                count: 0,

                errors: 0,

                durations: [],

                checkPassed: 0,

                checkFailed: 0,

                checkUnknown: 0

            };

        }

        bucket.statusesDetail[statusKey].count += 1;

        if (call.isError) bucket.statusesDetail[statusKey].errors += 1;

        if (call.duration != null) bucket.statusesDetail[statusKey].durations.push(call.duration);

        if (call.checkPassed === true) bucket.statusesDetail[statusKey].checkPassed += 1;

        else if (call.checkPassed === false) bucket.statusesDetail[statusKey].checkFailed += 1;

        else bucket.statusesDetail[statusKey].checkUnknown += 1;

        if (call.timestamp != null) {

            globalMinTs = globalMinTs == null ? call.timestamp : Math.min(globalMinTs, call.timestamp);

            globalMaxTs = globalMaxTs == null ? call.timestamp : Math.max(globalMaxTs, call.timestamp);

        }

    }



    const runDurationSeconds =

        globalMinTs != null && globalMaxTs != null && globalMaxTs > globalMinTs

            ? (globalMaxTs - globalMinTs) / 1000

            : 1;



    const perApi = Array.from(grouped.values()).map((bucket) => {

        const stats = computeDurationStats(bucket.durations);

        const statusesDetail = Object.entries(bucket.statusesDetail)

            .sort((a, b) => Number(a[0]) - Number(b[0]))

            .map(([status, detail]: [status: any, detail: any]) => ({

                status,

                count: detail.count,

                errors: detail.errors,

                errorRate: detail.count ? (detail.errors / detail.count) * 100 : 0,

                checkPassed: detail.checkPassed,

                checkFailed: detail.checkFailed,

                checkUnknown: detail.checkUnknown,

                ...computeDurationStats(detail.durations)

            }));

        return {

            key: bucket.key,

            method: bucket.method,

            endpoint: bucket.endpoint,

            stepName: bucket.stepName,

            sampleRemoteAddress: bucket.sampleRemoteAddress,

            total: bucket.total,

            errors: bucket.errors,

            errorRate: bucket.total ? (bucket.errors / bucket.total) * 100 : 0,

            tps: runDurationSeconds > 0 ? bucket.total / runDurationSeconds : 0,

            phases: bucket.phases,

            defaultEnabled: (bucket.phases.flow || 0) + (bucket.phases.teardown || 0) + (bucket.phases.other || 0) > 0,

            statuses: bucket.statuses,

            statusesDetail,

            ...stats

        };

    });



    perApi.sort((a, b) => (b.errorRate !== a.errorRate ? b.errorRate - a.errorRate : b.total - a.total));



    const totalCalls = perApi.reduce((acc, row) => acc + row.total, 0);

    const totalErrors = perApi.reduce((acc, row) => acc + row.errors, 0);

    const durations = apiCalls.map((c: any) => c.duration).filter((n: any) => n != null);



    return {

        runDurationSeconds,

        totalCalls,

        totalErrors,

        overallErrorRate: totalCalls ? (totalErrors / totalCalls) * 100 : 0,

        overallTps: runDurationSeconds > 0 ? totalCalls / runDurationSeconds : 0,

        overallStats: computeDurationStats(durations),

        perApi,

        callSeries: apiCalls.map((c: any) => ({

            key: c.key,

            rawType: c.rawType,

            isError: c.isError,

            duration: c.duration,

            status: c.status,

            checkPassed: c.checkPassed

        }))

    };

}

