export type VuPoint = { tMs: number; vus: number };



export type ScenarioVuSeries = {

    name: string;

    executor: string;

    startTimeMs: number;

    endTimeMs: number;

    points: VuPoint[];

};



export type VuPlan = {

    generatedAtEpochMs: number;

    totalDurationMs: number;

    maxVUs: number | null;

    scenarios: ScenarioVuSeries[];

    total: { points: VuPoint[] };

    notes: string[];

    apiPlan?: {

        steps: Array<{

            scenarios: string[];

            stepName: string | null;

            endpointRef: string | null;

            endpointImportFrom: string | null;

            load: number | null;

            loadMode: 'probabilistic' | 'exact' | null;

        }>;

        notes: string[];

    } | null;

};

