export type StepLoggingMode = "full" | "full_error_only" | "compact_success_full_error" | "off";

let cachedMode: StepLoggingMode | null = null;

function resolveLegacyStepLogging(raw: string): StepLoggingMode | null {
  if (raw === "off") return "off";
  if (raw === "errors_only" || raw === "errors-only" || raw === "errorsonly") return "compact_success_full_error";
  if (raw === "full") return "full";
  return null;
}

export function getStepLoggingMode(): StepLoggingMode {
  if (cachedMode) return cachedMode;

  const eventModeRaw =
    typeof __ENV !== "undefined" ? String((__ENV as any).UK6_EVENT_LOG_MODE || "").trim().toLowerCase() : "";
  if (eventModeRaw === "off" || eventModeRaw === "full" || eventModeRaw === "full_error_only") {
    cachedMode = eventModeRaw;
    return cachedMode;
  }
  if (eventModeRaw === "compact") {
    cachedMode = "compact_success_full_error";
    return cachedMode;
  }

  const legacyRaw = typeof __ENV !== "undefined" ? String((__ENV as any).UK6_STEP_LOGGING || "").trim().toLowerCase() : "";
  cachedMode = resolveLegacyStepLogging(legacyRaw) || "off";
  return cachedMode;
}

export function shouldLogStepCalls(mode: StepLoggingMode) {
  return mode === "full" || mode === "compact_success_full_error";
}

export function shouldLogStepErrors(mode: StepLoggingMode) {
  return mode === "full" || mode === "full_error_only" || mode === "compact_success_full_error";
}

export function shouldLogVuChanges(mode: StepLoggingMode) {
  return mode === "full" || mode === "compact_success_full_error";
}

export function shouldLogExceptions(mode: StepLoggingMode) {
  return mode === "full" || mode === "full_error_only" || mode === "compact_success_full_error";
}

export function shouldEmitCompactCallEvent(params: {
  mode: StepLoggingMode;
  success: boolean;
  failedCheck: boolean;
}) {
  const { mode, success, failedCheck } = params;
  return mode === "compact_success_full_error" && success && !failedCheck;
}

export function shouldEmitFullCallEvent(params: {
  mode: StepLoggingMode;
  success: boolean;
  failedCheck: boolean;
}) {
  const { mode } = params;
  return mode === "full";
}

export function shouldEmitFullErrorEvent(params: {
  mode: StepLoggingMode;
  success: boolean;
  failedCheck: boolean;
}) {
  const { mode, success, failedCheck } = params;
  if (mode === "off") return false;
  return !success || failedCheck;
}

type BuildStepLogEventParams = {
  mode: StepLoggingMode;
  type: string;
  flowName: string;
  stepName: string;
  stepIndex: number;
  url: string;
  method: string;
  requestBody?: any;
  requestHeaders?: any;
  requestParams?: any;
  timeout?: any;
  status?: number;
  checks?: Record<string, boolean>;
  tags?: Record<string, any>;
  response: any;
  error?: any;
};

export function buildStepLogEvent(params: BuildStepLogEventParams) {
  const {
    mode,
    type,
    flowName,
    stepName,
    stepIndex,
    url,
    method,
    requestBody,
    requestHeaders,
    requestParams,
    timeout,
    status,
    checks,
    tags,
    response,
    error,
  } = params;

  const base = {
    type,
    flowName,
    stepName,
    stepIndex,
    url,
    method,
    checks: checks || {},
    tags: tags || {},
  } as Record<string, any>;

  if (status != null) {
    base.status = status;
  }

  if (error) {
    base.error = error;
  }

  if (mode === "compact_success_full_error") {
    base.response = {
      status: response?.status,
      timings: response?.timings,
    };
    return base;
  }

  base.request = {
    headers: requestHeaders,
    body: requestBody,
    params: requestParams,
    timeout,
  };
  base.response = {
    status: response?.status,
    headers: response?.headers,
    timings: response?.timings,
    remote_ip: response?.remote_ip,
    remote_port: response?.remote_port,
    request_url: response?.request_url,
    body: response?.body,
  };
  return base;
}
