export type ApiPlanStep = {

    /** Danh sách scenario key (suy ra từ `options.scenarios[*].exec`). */

    scenarios: string[];

    /** Phase suy ra từ `createScenario({ plan })`. */

    phase: 'setup' | 'flow' | 'concurrent' | 'teardown' | 'unknown';

    /** Tên block (nếu có), ví dụ: tên concurrent group. */

    blockName: string | null;

    /** `name` trong `createStep({ name })`. */

    stepName: string | null;

    /** Tên biến endpoint (vd: `login`) nếu parse ra được. */

    endpointRef: string | null;

    /** Specifier của import cung cấp endpoint (vd: `"src/endpoints/APP"`). */

    endpointImportFrom: string | null;

    /** `load` (0..1). `null` nghĩa là không khai báo (mặc định = 1). */

    load: number | null;

    /** `loadMode` nếu có. */

    loadMode: 'probabilistic' | 'exact' | null;

    /** Vị trí source (best-effort) để debug. */

    source: { file: string; line: number | null; col: number | null } | null;

};



export type ApiPlan = {

    steps: ApiPlanStep[];

    notes: string[];

};

