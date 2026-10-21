export type FlowStepConfig = {

  name: string;

  endpoint: any;

  /** hiệu số tải (0–1). */

  load?: number;

  /**

   * Load gate mode

   *

   * - `probabilistic` (default): deterministic hash gate sử dụng (VU, ITER, stepIndex) ~ hành vi theo tỷ lệ

   * - `exact`: deterministic slice của số active VUs (1..K) với K = round(load * activeVUs) ~ hành vi chính xác

   */

  loadMode?: "probabilistic" | "exact";

  checks?: Array<{ name?: string; condition: (response: any) => boolean }>;

  /**Metric attachment rate/count trên từng response. */

  thresholds?: any[];

  extractors?: Record<string, ((response: any) => any) | string>;

  preprocessor?: any;

  postprocessor?: any;

  skipOn?: ((ctx: any) => boolean) | null;

  delay?: number;

};



export type FlowConcurrentGroupConfig = {

  /** Tùy chọn group name để log/trace. */

  name?: string;

  /** Steps chạy song song bởi `http.batch`. */

  steps: FlowStepConfig[];

};



export type NormalizedStep = {

  type: "step";

  name: string;

  endpoint: any;

  load: number;

  loadMode: "probabilistic" | "exact";

  checks: Array<{ name?: string; condition: (response: any) => boolean }>;

  thresholds: any[];

  extractors: Record<string, ((response: any) => any) | string>;

  preprocessor: any;

  postprocessor: any;

  skipOn: ((ctx: any) => boolean) | null;

  delay: number;

};



export type NormalizedConcurrentGroup = {

  type: "concurrent_group";

  name: string;

  steps: NormalizedStep[];

};



export type FlowEntry = NormalizedStep | NormalizedConcurrentGroup;



export type FlowOptions = {

  continueOnFailure?: boolean;

  delayBetweenSteps?: number;

  [k: string]: any;

};



export type FlowExecuteResult = {

  flowName: string;

  totalSteps: number;

  executedSteps: number;

  successfulSteps: number;

  results: any[];

  globalData: Record<string, any>;

  stoppedByLoad: boolean;

  stopAtStepIndex: number | null;

};



export type FlowRuntime = {

  name: string;

  options: any;

  globalData: Record<string, any>;

  normalizeLoad: (load: any, stepName?: string) => number;

  shouldRunStepByLoad: (step: any, stepIndex: number) => boolean;

  exactLoadState?: {

    totalVUs: number | null;

    vu: number;

    iter: number;

  } | null;

};



