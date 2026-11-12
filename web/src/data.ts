// View contracts mirror SearchRun/NormalizedResult JSON.
// Domain data stays outside the generic search contract. No dispatch/storage API.
export type EvidenceState = "VERIFIED" | "UNVERIFIED" | "UNKNOWN" | "CONFLICT";
export type Result = {
  result_id: string; title: string; url: string; normalized_url: string;
  snippet?: string | null; provider_refs: string[]; citations: string[];
  metadata: Record<string, string>;
};
export type Invocation = {
  provider_id: string; status: string; attempted: boolean;
  actual_usage_quantity?: number | null; estimated_usage_quantity?: number;
  usage_unit?: string; estimated_budget_cost?: number; actual_budget_cost?: number | null;
  budget_reservation_state?: string;
  currency?: string; pricing_policy_version?: string; estimate_mismatch?: boolean;
};
export type Run = {
  search_run_id: string; request_id: string; strategy: string; status: string;
  result_count: number; results: Result[]; provider_invocations: Invocation[];
  estimated_budget_cost: number; actual_budget_cost?: number | null; currency: string;
  started_at?: string; completed_at?: string | null; error?: string | null;
};
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const states = ["VERIFIED", "UNVERIFIED", "UNKNOWN", "CONFLICT"];
export function object(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("INVALID_DOCUMENT");
}
export function text(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length > 16000) throw Error("INVALID_TEXT");
}
export function list(value: unknown, limit = 100): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > limit) throw Error("INVALID_LIST");
}
export function member(value: unknown, values: string[]) {
  if (typeof value !== "string" || !values.includes(value)) throw Error("INVALID_STATE");
}
export function quantity(value: unknown, optional = false) {
  if (optional && value == null) return;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw Error("INVALID_QUANTITY");
}
export function documentJSON(value: string): unknown {
  if (new TextEncoder().encode(value).length > MAX_IMPORT_BYTES) throw Error("DOCUMENT_TOO_LARGE");
  return JSON.parse(value);
}
export function safeLink(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return;
    return url.href;
  } catch { return; }
}
export function evidenceStatus(result: Result): EvidenceState {
  const status = result.metadata.evidence_status;
  return states.includes(status) ? status as EvidenceState : "UNKNOWN";
}
// Display only known codes; never reflect arbitrary saved error text or infer a reason.
export function runFailureReason(run: Run) {
  switch (run.error) {
    case "NO_ELIGIBLE_PROVIDER": return { code: run.error, description: "利用可能なProviderがありません。" };
    case "TIMEOUT": return { code: run.error, description: "Runがタイムアウトしました。" };
    default: return undefined;
  }
}
export function parseRun(input: string): Run {
  const run = documentJSON(input); object(run);
  for (const key of ["search_run_id", "request_id", "strategy", "currency"]) text(run[key]);
  for (const key of ["started_at", "completed_at"]) if (run[key] != null) text(run[key]);
  if (run.error != null) text(run.error);
  member(run.status, ["QUEUED", "RUNNING", "PARTIAL", "SUCCEEDED", "FAILED", "CANCELLED", "BUDGET_BLOCKED"]);
  quantity(run.estimated_budget_cost); quantity(run.actual_budget_cost, true);
  quantity(run.result_count); list(run.results);
  if (run.result_count !== run.results.length) throw Error("RESULT_COUNT_MISMATCH");
  const ids = new Set();
  for (const result of run.results) {
    object(result);
    for (const key of ["result_id", "title", "url", "normalized_url"]) text(result[key]);
    if (ids.has(result.result_id)) throw Error("DUPLICATE_RESULT_ID");
    ids.add(result.result_id);
    if (result.snippet != null) text(result.snippet);
    for (const key of ["provider_refs", "citations"]) { list(result[key]); for (const item of result[key]) text(item); }
    object(result.metadata);
    if (Object.keys(result.metadata).length > 100) throw Error("INVALID_METADATA");
    for (const [key, value] of Object.entries(result.metadata)) { text(key); text(value); }
  }
  list(run.provider_invocations);
  for (const call of run.provider_invocations) {
    object(call); text(call.provider_id); text(call.status);
    if (typeof call.attempted !== "boolean") throw Error("INVALID_ATTEMPTED");
    for (const key of ["actual_usage_quantity", "estimated_usage_quantity", "estimated_budget_cost", "actual_budget_cost"]) quantity(call[key], true);
    for (const key of ["usage_unit", "budget_reservation_state", "currency", "pricing_policy_version"]) if (call[key] != null) text(call[key]);
    if (call.estimate_mismatch != null && typeof call.estimate_mismatch !== "boolean") throw Error("INVALID_MISMATCH");
  }
  return run as Run;
}

// Existing one-shot CLIs emit { execution, run, ...diagnostics }, not a bare Run.
// The execution label is an unverified input assertion, never evidence of billing.
export function parseSavedRun(input: string): { run: Run; execution: "LIVE" | "OFFLINE_MOCK" | "UNSPECIFIED" } {
  const document = documentJSON(input); object(document);
  if (!Object.hasOwn(document, "run")) return { run: parseRun(input), execution: "UNSPECIFIED" };
  if (Object.hasOwn(document, "search_run_id")) throw Error("AMBIGUOUS_DOCUMENT");
  member(document.execution, ["LIVE", "OFFLINE_MOCK"]);
  return { run: parseRun(JSON.stringify(document.run)), execution: document.execution as "LIVE" | "OFFLINE_MOCK" };
}
