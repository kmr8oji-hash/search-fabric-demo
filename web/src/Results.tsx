import { evidenceStatus, runFailureReason, safeLink, type Run } from "./data";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function State({ value }: { value: string }) {
  return <span className="state" data-state={value}>{value}</span>;
}
export function SourceLink({ url, children }: { url: string; children?: ReactNode }) {
  const href = safeLink(url);
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children ?? url}</a>
    : <span>{children ?? url}（リンク無効）</span>;
}
const value = (amount: number | null | undefined, unit: string) => amount == null ? "UNKNOWN" : `${amount} ${unit}`;

// Visual tokens and list/inspector interaction adapted from recovered N2-C; data stays current.
export function SearchResults({ run, filter = "" }: { run: Run; filter?: string }) {
  const failure = runFailureReason(run);
  const results = run.results.filter(result => `${result.title} ${result.url} ${result.snippet ?? ""}`.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()));
  const [selected, setSelected] = useState<string | undefined>(run.results[0]?.result_id);
  const [detailOpen, setDetailOpen] = useState(false);
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const heading = useRef<HTMLHeadingElement>(null);
  const result = results.find(item => item.result_id === selected) ?? results[0];
  const restoreFocus = useRef(false);
  useLayoutEffect(() => {
    if (detailOpen) heading.current?.focus();
    else if (restoreFocus.current && result) rows.current.get(result.result_id)?.focus();
    restoreFocus.current = false;
  // Filtering must not move focus out of the search field.
  }, [detailOpen, selected]);
  const choose = (id: string, open: boolean) => {
    setSelected(id); setDetailOpen(open);
    if (open && detailOpen) heading.current?.focus();
  };
  const back = () => {
    restoreFocus.current = true;
    setDetailOpen(false);
  };
  return <section className="run" aria-label={`SearchRun ${run.search_run_id}`}>
    <header className="run-summary row"><h2>Provider / Search Status <State value={run.status} /></h2>
      <span>{run.provider_invocations.map(call => call.provider_id).join(" · ") || "Provider UNKNOWN"} · {run.result_count}件</span></header>
    {failure && <p>Run全体の失敗理由（保存記録）: {failure.description}</p>}
    <div className={`workspace ${detailOpen ? "detail-open" : ""}`} onKeyDown={event => {
      if (event.key === "Escape" && detailOpen && !event.nativeEvent.isComposing) { event.preventDefault(); back(); }
    }}>
      <section className="results-pane panel" aria-labelledby="result-index">
        <div className="panel-heading"><h2 id="result-index" tabIndex={-1}>RESULT INDEX / 検索結果</h2><span>{results.length} / {run.result_count}</span></div>
        <p className="muted panel-help">クリック・タップで詳細。↑↓で選択。</p>
        {!results.length && <p className="empty-panel">{run.results.length ? "絞り込みに一致する結果はありません。" : "保存された結果はありません。"}</p>}
        <ol className="result-list" aria-label="検索結果一覧">{results.map((item, index) => <li key={item.result_id}>
          <button className="result-row" aria-pressed={item.result_id === result?.result_id} tabIndex={item.result_id === result?.result_id ? 0 : -1}
            ref={node => { if (node) rows.current.set(item.result_id, node); else rows.current.delete(item.result_id); }}
            onClick={() => choose(item.result_id, true)} onKeyDown={event => {
              if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.nativeEvent.isComposing) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
                event.preventDefault();
                const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? results.length - 1 : Math.max(0, Math.min(results.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
                const next = results[nextIndex]; choose(next.result_id, false); rows.current.get(next.result_id)?.focus();
              }
            }} aria-label={`${item.title} 詳細を表示`}>
            <span className="row-marker" aria-hidden="true">{item.result_id === result?.result_id ? "›" : "·"}</span>
            <span className="row-text"><span className="row-title">{item.title}</span><span className="row-url">{item.url}</span>
              <span className="row-snippet">{item.snippet ?? "Snippet: UNKNOWN"}</span><State value={evidenceStatus(item)} /></span>
          </button>
        </li>)}</ol>
      </section>
      <section className="inspector panel" aria-labelledby="inspector-title">
        <div className="panel-heading">{detailOpen && <button onClick={back}>← 結果に戻る</button>}<h2 id="inspector-title" ref={heading} tabIndex={-1}>INSPECTOR / 出典・根拠</h2></div>
        <div className="inspector-content">{result ? <article className="result" key={result.result_id}>
          <State value={evidenceStatus(result)} /><h3>{result.title}</h3>
          <p className="muted">Evidence状態は入力の主張です。検索成功やProvider情報から検証済みとは判定しません。</p>
          <h4>検索結果の説明</h4><p>{result.snippet ?? "Snippet: UNKNOWN"}</p>
          <h4>Source</h4><p className="url"><SourceLink url={result.url} /></p>
          <details open><summary>Citation / Source（{result.citations.length}）</summary>
            {result.citations.length ? <ul>{result.citations.map((citation, i) => <li key={i}><SourceLink url={citation} /></li>)}</ul> : <p>UNKNOWN：Citation未提供</p>}
          </details>
          <details className="technical-disclosure"><summary>結果の技術情報</summary>
            <p>Result ID: {result.result_id}</p><p>Provider / Reference: {result.provider_refs.join(" · ") || "UNKNOWN"}</p><p>Normalized URL: {result.normalized_url}</p>
            <h4>記録済みMetadata / Provenance（入力の主張）</h4>
            {Object.keys(result.metadata).length ? <dl>{Object.entries(result.metadata).map(([key, entry]) => <div key={key}><dt>{key}</dt><dd>{entry}</dd></div>)}</dl> : <p>UNKNOWN：Provenance未提供</p>}
          </details>
        </article> : <p className="empty-panel">表示する結果がありません。</p>}</div>
      </section>
    </div>
    <details className="technical-disclosure" key={run.search_run_id}><summary>Run / Provider / CostGuard の技術情報</summary>
      <p>Run-level失敗理由（保存記録）: {failure?.code ?? "UNKNOWN"}</p>
      <p className="muted">Run: {run.search_run_id} · {run.strategy}</p>
      <p>Request: {run.request_id} · 開始: {run.started_at ?? "UNKNOWN"} · 完了: {run.completed_at ?? "UNKNOWN"}</p>
      <dl className="metrics">
        <div><dt>内部予算見積</dt><dd>{value(run.estimated_budget_cost, run.currency)}</dd></div>
        <div><dt>内部予算実績</dt><dd>{value(run.actual_budget_cost, run.currency)}</dd></div>
      </dl>
      <p className="muted">内部予算換算額です。実請求額の確定を示しません。</p>
      {run.provider_invocations.map((call, i) => <div className="invocation" key={i}>
        <strong>{call.provider_id}</strong> <State value={call.status} /> · HTTP試行: {call.attempted ? "あり" : "なし"}
        <p>Usage実績: {value(call.actual_usage_quantity, call.usage_unit || "単位UNKNOWN")} · 見積: {value(call.estimated_usage_quantity, call.usage_unit || "単位UNKNOWN")}</p>
        <p>予約状態: {call.budget_reservation_state ?? "UNKNOWN"} · 内部見積: {value(call.estimated_budget_cost, call.currency || "通貨UNKNOWN")} · 内部実績: {value(call.actual_budget_cost, call.currency || "通貨UNKNOWN")}</p>
        <p>換算Policy: {call.pricing_policy_version || "UNKNOWN"} · 見積不一致: {call.estimate_mismatch == null ? "UNKNOWN" : String(call.estimate_mismatch)}</p>
      </div>)}
    </details>
  </section>;
}
