export type SetupTaskConfig = {

  /** Tên task (để log/trace và làm key mặc định cho kết quả trả về). */

  name: string;



  /** `EndpointModel` hoặc factory `(ctx) => EndpointModel` chạy trong `setup()`. */

  endpoint: any;



  /**

   * Hàm xử lý response và dữ liệu đã parse JSON để trả về object sẽ merge vào `ctx`.

   * Nếu không truyền, framework sẽ dùng `sessionPaths` (nếu có) hoặc `{ [name]: data }`.

   */

  onResponse?: (response: any, data: any) => Record<string, any>;



  /**

   * Danh sách dot-path để tìm `sessionId` trong response JSON.

   * Khi có `sessionPaths` mà không tìm thấy sessionId, setup sẽ throw error.

   */

  sessionPaths?: string[];



  /** Danh sách checks chạy trong `setup()` (vd: `assertStatus(200)`). */

  checks?: Array<{ name?: string; condition: (response: any) => boolean }>;



  /**

   * Map extractor để ghi thêm dữ liệu vào `ctx`:

   * - value có thể là function `(response) => any`

   * - hoặc string dot-path (vd: `"result.sessionId"`)

   */

  extractors?: Record<string, ((response: any) => any) | string>;



  /**

   * Xử lý trước khi gọi API trong `setup()`.

   * - Có thể nhận `(ctx)` hoặc `(endpoint, ctx)`

   * - Có thể trả về endpoint mới để override body/headers/params

   */

  preprocessor?: any;



  /** Chạy sau khi nhận response trong `setup()` (vd: `logFields(...)`). */

  postprocessor?: any;

};



export type StepCheckConfig = {

  name?: string;

  /**

   * Chữ ký hàm check (tương thích ngược):

   * - kiểu cũ: `(response) => boolean`

   * - kiểu tối ưu: `(response, data, ctx) => boolean`, trong đó `data` là JSON body đã parse (hoặc `{}`),

   *   còn `ctx` là flow context.

   */

  condition: (response: any, data?: any, ctx?: any) => boolean;

};



export type FlowStepDefinition = {

  /** Tên step (để log/trace). */

  name: string;



  /** `EndpointModel` hoặc factory `(ctx) => EndpointModel`. */

  endpoint: any;



  /**

   * Hook chỉ dùng cho setup khi step này được dùng trong `setupTasks`.

   * Nếu được khai báo, `setup()` sẽ merge object trả về vào `ctx`.

   */

  onResponse?: (response: any, data: any) => Record<string, any>;



  /**

   * Tiện ích chỉ dùng cho setup khi step này được dùng trong `setupTasks`.

   * Nếu có `sessionPaths` và không truyền `onResponse`, `setup()` sẽ cố gắng trích `sessionId`

   * từ JSON response (đã parse) theo các dot-path này và throw nếu không tìm thấy.

   */

  sessionPaths?: string[];



  /**

   * Tỷ lệ load cho step này (0–1).

   *

   * - Trong block flow tuần tự: chỉ `load` phần VU tiếp tục tới step này; phần còn lại dừng flow trước step.

   * - Trong block concurrent: chỉ `load` phần VU đưa step này vào nhóm `http.batch`.

   */

  load?: number;



  /**

   * Chế độ gate `load` cho step này.

   *

   * - `probabilistic` (mặc định): gate theo hash xác định trước dựa trên `(VU, ITER, stepIndex)`, hành vi gần giống xác suất.

   * - `exact`: chọn lát cắt xác định trước của active VU (`1..K`), với `K = round(load * activeVUs)` cho step đó.

   */

  loadMode?: "probabilistic" | "exact";



  /** Danh sách checks cho step (vd: `assertStatus(200)`, `assertPath(...)`). */

  checks?: StepCheckConfig[];



  /** Metric attachment tùy biến (rate/count), được đánh giá trên từng response. */

  thresholds?: any[];



  /**

   * Map extractor để ghi thêm dữ liệu vào `ctx` sau step:

   * - value có thể là function `(response) => any`

   * - hoặc string dot-path (vd: `"result.data.id"`)

   */

  extractors?: Record<string, ((response: any) => any) | string>;



  /**

   * Xử lý trước khi gọi API của step.

   * - Có thể nhận `(ctx)` hoặc `(endpoint, ctx)`

   * - Có thể trả về endpoint mới (thường dùng để gắn `sessionId` vào body/headers)

   */

  preprocessor?: any;



  /** Chạy sau khi nhận response của step (vd: log fields, custom log). */

  postprocessor?: any;



  /** Nếu trả `true` thì bỏ qua step. */

  skipOn?: ((ctx: any) => boolean) | null;



  /** Sleep sau step (giây). Nếu không set sẽ dùng `delayBetweenSteps` của Flow. */

  delay?: number;

};



export type ScenarioPlanBlock =

  | { type: "flow"; name?: string; steps: FlowStepDefinition[] }

  | { type: "concurrent"; name?: string; steps: FlowStepDefinition[] }

  | { type: "setup"; name?: string; steps: Array<SetupTaskConfig | FlowStepDefinition> }

  | { type: "teardown"; name?: string; steps: Array<SetupTaskConfig | FlowStepDefinition> };



export type ScenarioPlanItem = ScenarioPlanBlock | FlowStepDefinition[];



export type ScenarioArgs = {

  flowName: string;

  setupTasks?: Array<SetupTaskConfig | FlowStepDefinition>;

  teardownTasks?: Array<SetupTaskConfig | FlowStepDefinition>;

  flowSteps?: FlowStepDefinition[];

  concurrentSteps?: FlowStepDefinition[];

  plan?: ScenarioPlanItem[];

  logFailures?: boolean;

};



