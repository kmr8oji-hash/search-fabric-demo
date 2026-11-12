import p1 from "./fixtures/providerNativeP1.synthetic.json";
import { documentJSON, object, parseRun, MAX_IMPORT_BYTES, type Run } from "./data";

export const providerIds = ["tavily", "exa", "perplexity"] as const;
export type ProviderId = typeof providerIds[number];
export type Slot = { child_id: string; provider_id: ProviderId; run_id: string | null; data_ref: string; reason?: string };
export type Manifest = { schema_version: "search-fabric-group/1"; source: "BUNDLED_SYNTHETIC" | "OFFLINE_MOCK_SESSION"; group_id: string; query: string; children: Slot[] };
export type NativeView = { state: string; reason: string | null; texts: { title: string; url: string; content: string | null }[] };
export type ChildView = { slot: Slot; run?: Run; error?: string; native?: NativeView; nativeError?: string };
export type GroupView = { manifest: Manifest; children: ChildView[] };
export type Scenario = "normal" | "partial" | "large" | "policy";
export const nativeLimit = 1_000_000;

// P2 has no upload/import authority: only the bundled synthetic registry uses this codec.
// Manifest <=64 KiB; each child independently retains the existing 2 MiB parser limit.
export async function readSyntheticGroup(manifestText: string, registry: ReadonlyMap<string, string>): Promise<GroupView> {
  return readGroup(manifestText, registry, "BUNDLED_SYNTHETIC");
}

// Distinct same-session boundary. LIVE origins are deliberately unsupported.
export async function readOfflineSession(input: unknown): Promise<GroupView> {
  object(input); object(input.manifest); object(input.children);
  if (input.schema_version !== "search-fabric-session/1" || input.origin !== "OFFLINE_MOCK_SESSION"
      || typeof input.operation_id !== "string" || input.manifest.group_id !== input.operation_id
      || !Array.isArray(input.manifest.children) || input.manifest.children.length !== 1) throw Error("SESSION_ORIGIN_DENIED");
  const registry = new Map<string, string>();
  for (const slot of input.manifest.children) {
    object(slot); const c = input.children[String(slot.data_ref)]; object(c); object(c.binding); object(c.run);
    object(c.native); object(c.native.envelope); object(c.native.envelope.receipt);
    if (c.binding.run_id !== slot.run_id || c.run.search_run_id !== slot.run_id
        || c.binding.request_id !== c.run.request_id
        || c.binding.receipt_id !== c.native.envelope.receipt.receipt_id) throw Error("RECEIPT_BINDING_MISMATCH");
    registry.set(String(slot.data_ref), JSON.stringify(c));
  }
  return readGroup(JSON.stringify(input.manifest), registry, "OFFLINE_MOCK_SESSION");
}

async function readGroup(manifestText: string, registry: ReadonlyMap<string, string>, source: Manifest["source"]): Promise<GroupView> {
  if (new TextEncoder().encode(manifestText).length > 65536) throw Error("GROUP_TOO_LARGE");
  const m = documentJSON(manifestText); object(m);
  if (m.schema_version !== "search-fabric-group/1" || m.source !== source
      || typeof m.group_id !== "string" || !m.group_id || typeof m.query !== "string"
      || m.query.length > 400 || !Array.isArray(m.children) || !m.children.length || m.children.length > 3) throw Error("INVALID_GROUP");
  const children: Slot[] = [], ids = new Set<string>(), providers = new Set<string>(), runs = new Set<string>();
  for (const value of m.children) {
    object(value);
    if (typeof value.child_id !== "string" || !value.child_id || ids.has(value.child_id)
        || !providerIds.includes(value.provider_id as ProviderId) || providers.has(value.provider_id as string)
        || typeof value.data_ref !== "string" || !value.data_ref
        || (value.run_id !== null && (typeof value.run_id !== "string" || !value.run_id || runs.has(value.run_id)))
        || (value.reason != null && value.reason !== "NOT_DISPATCHED_HOLD")) throw Error("INVALID_GROUP_CHILD");
    ids.add(value.child_id); providers.add(value.provider_id as string);
    if (typeof value.run_id === "string") runs.add(value.run_id);
    children.push(value as Slot);
  }
  const manifest = { ...m, children } as Manifest;
  const views = await Promise.all(children.map(async slot => {
    if (slot.run_id === null) return { slot, error: "NOT_DISPATCHED_HOLD" };
    try {
      const text = registry.get(slot.data_ref);
      if (text === undefined) throw Error();
      const child = documentJSON(text); object(child);
      if (child.execution !== "OFFLINE_MOCK") throw Error();
      const run = parseRun(JSON.stringify(child.run));
      if (run.search_run_id !== slot.run_id || run.provider_invocations.length !== 1
          || run.provider_invocations[0].provider_id !== slot.provider_id
          || run.results.some(r => r.provider_refs.length !== 1 || r.provider_refs[0] !== slot.provider_id)) throw Error();
      const view: ChildView = { slot, run };
      if (child.native != null) {
        try { view.native = await readNative(child.native, slot, run); }
        catch { view.nativeError = "NATIVE_UNAVAILABLE"; }
      }
      return view;
    } catch { return { slot, error: "CHILD_UNREADABLE" }; }
  }));
  return { manifest, children: views };
}

async function readNative(input: unknown, slot: Slot, run: Run): Promise<NativeView> {
  object(input); object(input.envelope);
  const e = input.envelope; object(e.receipt); object(e.policy);
  const r = e.receipt, policy = e.policy;
  if (input.execution !== "OFFLINE_MOCK" || e.schema_version !== "search-fabric-native/1"
      || e.lifetime !== "EPHEMERAL" || r.provider_id !== slot.provider_id || slot.provider_id !== "tavily"
      || r.api_profile !== "basic-search" || r.artifact_kind !== "PROVIDER_SEARCH_RESULTS"
      || !["SESSION_READY", "METADATA_ONLY", "CAPTURE_FAILED"].includes(r.state as string)
      || (r.reason !== null && typeof r.reason !== "string")) throw Error();
  if (r.state !== "SESSION_READY") {
    if (input.payload_base64 !== null || r.payload_sha256 !== null || r.fidelity !== "NONE") throw Error();
    return { state: r.state as string, reason: r.reason as string | null, texts: [] };
  }
  if (policy.synthetic_test !== true || policy.transient_display !== "ALLOW"
      || r.fidelity !== "EXACT_ENTITY_BODY" || input.payload_encoding !== "base64"
      || typeof input.payload_base64 !== "string" || input.payload_base64.length > 1333336) throw Error();
  const bytes = Uint8Array.from(atob(input.payload_base64), c => c.charCodeAt(0));
  if (bytes.length > nativeLimit || bytes.length !== r.entity_byte_count) throw Error();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), x => x.toString(16).padStart(2, "0")).join("");
  if (hash !== r.payload_sha256) throw Error();
  const data: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); object(data);
  if (!Array.isArray(data.results) || data.results.length !== run.results.length || data.results.length > 10) throw Error();
  const texts = data.results.map((item, i) => {
    object(item);
    if (typeof item.title !== "string" || typeof item.url !== "string"
        || item.url !== run.results[i].url || (item.content != null && typeof item.content !== "string")) throw Error();
    return { title: item.title, url: item.url, content: item.content as string | null ?? null };
  });
  return { state: "SESSION_READY", reason: null, texts };
}

function runFor(id: ProviderId): Run {
  return {
    search_run_id: `p2-${id}-run`, request_id: `p2-${id}-request`, strategy: "DIRECT", status: "SUCCEEDED",
    result_count: 2, estimated_budget_cost: 10, actual_budget_cost: id === "perplexity" ? null : 10,
    currency: "JPY", started_at: "2026-11-01T00:00:00Z",
    provider_invocations: [{ provider_id: id, status: "SUCCEEDED", attempted: true,
      actual_usage_quantity: id === "perplexity" ? null : 1, usage_unit: id === "tavily" ? "tavily_credit" : "synthetic_unit" }],
    results: p1.projection.map((r, i) => ({ ...r, result_id: `shared-result-${i}`, provider_refs: [id],
      metadata: { evidence_status: "UNVERIFIED" },
      title: id === "tavily" ? r.title : `${id === "exa" ? "Exa" : "Perplexity"}の取得記録 ${i + 1}（合成）`,
      snippet: id === "tavily" ? r.snippet : `${i + 1}番目の正規化済み合成抜粋です。原出力は保存されていません。` })),
  };
}

export async function syntheticBundle(scenario: Scenario = "normal"): Promise<{ manifest: string; registry: Map<string, string> }> {
  const manifest: Manifest = { schema_version: "search-fabric-group/1", source: "BUNDLED_SYNTHETIC",
    group_id: `p2-synthetic-${scenario}`, query: "公開ドキュメントの更新情報（合成）",
    children: providerIds.map(id => ({ child_id: `p2-${id}-child`, provider_id: id, run_id: `p2-${id}-run`, data_ref: id })) };
  const registry = new Map<string, string>();
  for (const id of providerIds) {
    const run = runFor(id), native = id === "tavily" ? structuredClone(p1) : undefined;
    if (native && scenario === "policy") {
      Object.assign(native.envelope.receipt, { state: "METADATA_ONLY", reason: "POLICY_DENIED", fidelity: "NONE", payload_sha256: null });
      Object.assign(native, { payload_base64: null });
      native.envelope.policy.transient_display = "UNKNOWN";
    }
    if (native && scenario === "large") {
      const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(native.payload_base64!), c => c.charCodeAt(0))));
      data.results[0].content = "Large synthetic excerpt. ".repeat(35000);
      const bytes = new TextEncoder().encode(JSON.stringify(data));
      let encoded = "";
      for (let i = 0; i < bytes.length; i += 8192) encoded += String.fromCharCode(...bytes.subarray(i, i + 8192));
      native.payload_base64 = btoa(encoded);
      native.envelope.receipt.entity_byte_count = bytes.length;
      native.envelope.receipt.payload_sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), x => x.toString(16).padStart(2, "0")).join("");
    }
    if (scenario === "partial" && id === "exa") {
      Object.assign(run, { status: "FAILED", error: "TIMEOUT", results: [], result_count: 0, actual_budget_cost: null });
      Object.assign(run.provider_invocations[0], { status: "FAILED", actual_usage_quantity: null });
    }
    if (scenario === "partial" && id === "perplexity") Object.assign(manifest.children[2], { run_id: null, reason: "NOT_DISPATCHED_HOLD" });
    registry.set(id, scenario === "large" && id === "exa" ? "{invalid child" : JSON.stringify({ execution: "OFFLINE_MOCK", run, native }));
  }
  if ([...registry.values()].some(v => new TextEncoder().encode(v).length > MAX_IMPORT_BYTES)) throw Error("FIXTURE_TOO_LARGE");
  return { manifest: JSON.stringify(manifest), registry };
}
