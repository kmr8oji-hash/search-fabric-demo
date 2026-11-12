import { useEffect, useRef, useState } from "react";
import { evidenceStatus } from "./data";
import { SourceLink } from "./Results";
import { RecordedText } from "./RecordedText";
import { FabricMark, ChromeIcon } from "./penpot/Chrome";
import { ProviderBadge } from "./penpot/ProviderVisual";
import { providerIds, syntheticBundle, readSyntheticGroup, type ChildView, type GroupView, type ProviderId, type Scenario } from "./providerResultsData";
import "./penpot/chrome.css";
import "./penpot/workspace.css";
import "./providerResults.css";

const labels = { tavily: "Tavily", exa: "Exa", perplexity: "Perplexity" };
const usage = (n: number | null | undefined, unit: string) => n == null ? "UNKNOWN（未確認）" : `${n} ${unit}`;
const failure = (child: ChildView) => ["TIMEOUT", "UPSTREAM", "INVALID_RESPONSE", "PERSISTENCE_UNAVAILABLE"].includes(child.run?.error ?? "") ? child.run!.error : "理由未確認";
function state(child: ChildView) {
  if (child.error === "NOT_DISPATCHED_HOLD") return "未実行 · HOLD";
  if (child.error) return "読込失敗";
  if (child.run?.status === "FAILED") return `取得失敗 · ${failure(child)}`;
  if (child.run?.status === "PARTIAL") return "取得記録あり · PARTIAL";
  return child.run?.results.length ? "取得記録あり" : "結果0件";
}
function availability(child: ChildView) {
  if (child.nativeError) return "Native読込失敗 · LEGACY_NORMALIZED_ONLY";
  if (!child.native) return "原出力未保存 · LEGACY_NORMALIZED_ONLY";
  if (child.native.state === "SESSION_READY") return "Native原出力 · 合成・一時表示のみ";
  if (child.native.reason === "POLICY_DENIED") return "原文保存・表示不可（Policy）· 本文なし · LEGACY_NORMALIZED_ONLY";
  return child.native.state === "CAPTURE_FAILED" ? "原出力取得失敗 · 本文なし · LEGACY_NORMALIZED_ONLY" : "原出力本文なし · LEGACY_NORMALIZED_ONLY";
}
function count(child: ChildView) {
  return child.error === "CHILD_UNREADABLE" ? "件数不明" : child.error === "NOT_DISPATCHED_HOLD" ? "未取得" : `${child.run?.results.length ?? 0}件`;
}

function ProviderPane({ child, portfolioDemo = false }: { child: ChildView; portfolioDemo?: boolean }) {
  const ResultLink = ({ url }: { url: string }) => portfolioDemo ? <span>{url}（合成URL・外部遷移なし）</span> : <SourceLink url={url} />;
  const [sourceIndex, setSourceIndex] = useState<number>();
  const [citationIndex, setCitationIndex] = useState(0);
  const sourceHeading = useRef<HTMLHeadingElement>(null), trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (sourceIndex !== undefined) sourceHeading.current?.focus(); }, [sourceIndex, citationIndex]);
  const run = child.run, source = sourceIndex === undefined ? undefined : run?.results[sourceIndex];
  function close() { setSourceIndex(undefined); trigger.current?.focus(); }
  const call = run?.provider_invocations[0];
  return <section className="p2-pane" aria-label={`${labels[child.slot.provider_id]}の検索結果`} onKeyDown={e => { if (e.key === "Escape") close(); }}>
    <header className="p2-provider-heading"><ProviderBadge id={child.slot.provider_id} /><span>{state(child)} · {count(child)}</span></header>
    {child.error ? <p className="p2-notice" role="status">{child.error === "NOT_DISPATCHED_HOLD" ? "UNKNOWN HOLDのため未実行です。他のProviderの取得記録は閲覧できます。" : "このProviderの記録を読み込めません。他のProviderの結果は保持しています。"}</p> : <>
      <p className="p2-provenance">{availability(child)}</p>
      {(child.nativeError || child.native && child.native.state !== "SESSION_READY") && <p className="p2-muted">以下は許可済みの正規化された合成記録です。Native本文は表示していません。</p>}
      <p className="p2-muted">Providerの生成回答は取得していません。検索結果を取得順に表示します。</p>
      <p className="p2-usage">Usage: {usage(call?.actual_usage_quantity, call?.usage_unit ?? "単位不明")} · 内部予算実績: {usage(run?.actual_budget_cost, run?.currency ?? "JPY")}<br />実請求額: UNKNOWN · 内部予算は精算済み請求額ではありません</p>
      {run?.status === "FAILED" && <p className="p2-notice" role="status">このProviderは取得失敗しました（{failure(child)}）。自動再送は行いません。</p>}
      {!run?.results.length && run?.status !== "FAILED" && <p className="p2-notice">検索結果の本文はありません。</p>}
      <ol className="p2-results">{run?.results.map((result, index) => {
        const native = child.native?.texts[index], text = native?.content ?? result.snippet;
        const recordedRank = result.metadata.original_rank;
        const rank = recordedRank && /^[1-9][0-9]?$/.test(recordedRank) ? Number(recordedRank) : index + 1;
        return <li className="p2-result" data-result-key={`${child.slot.child_id}:${result.result_id}`} key={`${child.slot.child_id}:${result.result_id}`}>
          <p className="p2-result-index">取得順 {rank} <span>{evidenceStatus(result)} · 未独立検証</span></p>
          <h2>{native?.title ?? result.title}</h2><p className="p2-url"><ResultLink url={native?.url ?? result.url} /></p>
          {text ? <RecordedText text={text.slice(0, 1500)} /> : <p className="p2-muted">抜粋は未提供です。</p>}
          {text && text.length > 1500 && <details className="p2-fulltext"><summary>省略した抜粋をすべて表示（追加取得なし）</summary><pre>{text}</pre></details>}
          <div className="p2-citations">{result.citations.map((_, i) => <button key={`${child.slot.child_id}:${result.result_id}:${i}`} aria-label={`${labels[child.slot.provider_id]} 取得順${rank} 出典${i + 1}`} onClick={e => { trigger.current = e.currentTarget; setSourceIndex(index); setCitationIndex(i); }}>出典 [{i + 1}]</button>)}</div>
        </li>;
      })}</ol>
    </>}
    {source && <aside className="p2-source" aria-label="出典と根拠"><header><h2 ref={sourceHeading} tabIndex={-1}>出典と根拠 [{citationIndex + 1}]</h2><button onClick={close} aria-label="出典パネルを閉じる">閉じる</button></header>
      <ProviderBadge id={child.slot.provider_id} /><h3>{source.title}</h3><p>{evidenceStatus(source)} · 入力資料の状態であり、事実確認済みを意味しません。</p>
      <blockquote>{child.native?.texts[sourceIndex!]?.content?.slice(0, 1500) ?? source.snippet ?? "抜粋未提供"}</blockquote>
      <ResultLink url={source.citations[citationIndex]} /><p className="p2-muted">Fabric source-link。引用本文の正確性やProvider由来の引用注釈を新たに認定しません。</p>
      <details><summary>出典の識別情報</summary><p>Child: {child.slot.child_id}<br />Run: {run?.search_run_id}<br />Result: {source.result_id}<br />Citation index: {citationIndex}</p></details>
    </aside>}
  </section>;
}

export function ProviderResults({ initialGroup, sessionOnly = false, portfolioDemo = false }: { initialGroup?: GroupView; sessionOnly?: boolean; portfolioDemo?: boolean } = {}) {
  const [group, setGroup] = useState(initialGroup), [scenario, setScenario] = useState<Scenario>("normal");
  const [selected, setSelected] = useState<ProviderId[]>([...providerIds]), [active, setActive] = useState<ProviderId>("tavily");
  const [busy, setBusy] = useState(!initialGroup && !sessionOnly), [error, setError] = useState("");
  const ticket = useRef(0);
  async function load(next: Scenario) {
    const id = ++ticket.current; setBusy(true); setError("");
    try {
      const bundle = await syntheticBundle(next), value = await readSyntheticGroup(bundle.manifest, bundle.registry);
      if (id === ticket.current) { setGroup(value); setScenario(next); }
    } catch { if (id === ticket.current) setError("合成記録を読み込めません。直前の結果を保持しました。"); }
    finally { if (id === ticket.current) setBusy(false); }
  }
  useEffect(() => { if (!initialGroup && !sessionOnly) void load("normal"); return () => { ticket.current++; }; }, []);
  const child = group?.children.find(c => c.slot.provider_id === active);
  function toggle(id: ProviderId) {
    const next = selected.includes(id) ? selected.filter(p => p !== id) : providerIds.filter(p => p === id || selected.includes(p));
    if (!next.length) return;
    setSelected(next); if (!next.includes(active)) setActive(next[0]);
  }
  return <main className="sf-app p2-app">
    <aside className="sf-sidebar p2-sidebar"><div className="sf-brand"><FabricMark /><span>Search Fabric</span></div>
      <nav><span className="p2-current"><ChromeIcon name="search" />検索結果</span>{!portfolioDemo && <><a href="/penpot-preview.html">既存の検索画面</a><a href="/">保存済み検索</a></>}</nav>
      <p>Providerの記録を読む。<br />要約・比較は明示操作へ。</p><small>合成サンプルのみ<br />実検索・AI生成なし</small>
    </aside>
    <header className="sf-topbar"><strong>検索結果</strong><span className="sf-preview-pill">合成サンプル · Offline</span></header>
    <div className="p2-reader"><div className="p2-width">
      <p className="p2-eyebrow">PROVIDER SEARCH RESULTS</p><h1>{group?.manifest.query ?? (sessionOnly ? "質問からNative結果へ（Mock限定）" : "取得記録を準備しています")}</h1>
      <p className="p2-muted">検索サービスごとの原記録を確認できます。自動統合・再順位付け・AI生成は行いません。</p>
      <div className="p2-controls"><fieldset disabled={busy || sessionOnly}><legend>表示するProvider（最大3）</legend>{(sessionOnly ? ["tavily"] as const : providerIds).map(id => <label key={id}><input type="checkbox" checked={selected.includes(id)} onChange={() => toggle(id)} /><ProviderBadge id={id} /></label>)}</fieldset>
        {!sessionOnly && <label className="p2-scenario">合成シナリオ<select aria-label="合成シナリオ" value={scenario} disabled={busy} onChange={e => void load(e.target.value as Scenario)}><option value="normal">取得記録</option><option value="partial">一部失敗・未実行</option><option value="large">大きい原文・不正child</option><option value="policy">Native本文の利用不可</option></select></label>}</div>
      {error && <p role="alert">{error}</p>}{busy && <p role="status">合成記録を読込中…</p>}
      <div className="p2-tabs" role="tablist" aria-label="Provider別結果">{group?.children.filter(c => selected.includes(c.slot.provider_id)).map(c => <button key={c.slot.child_id} id={`p2-tab-${c.slot.provider_id}`} role="tab" tabIndex={active === c.slot.provider_id ? 0 : -1} aria-selected={active === c.slot.provider_id} aria-controls={`p2-panel-${c.slot.provider_id}`} disabled={busy} onClick={() => setActive(c.slot.provider_id)} onKeyDown={e => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault(); const index = selected.indexOf(active);
        const next = selected[e.key === "Home" ? 0 : e.key === "End" ? selected.length - 1 : (index + (e.key === "ArrowRight" ? 1 : selected.length - 1)) % selected.length];
        setActive(next); document.getElementById(`p2-tab-${next}`)?.focus();
      }}><ProviderBadge id={c.slot.provider_id} /><span>{count(c)} · {state(c)}</span></button>)}</div>
      {child && <div id={`p2-panel-${active}`} role="tabpanel" aria-labelledby={`p2-tab-${active}`}><ProviderPane key={`${group?.manifest.group_id}:${child.slot.child_id}`} child={child} portfolioDemo={portfolioDemo} /></div>}
      <p className="p2-footnote">同じURLもProviderごとの別記録です。Gemma要約・横断分析は未実行です。</p>
      {!portfolioDemo && <a className="p2-back" href="/penpot-preview.html">既存の検索・Composer画面へ</a>}
    </div></div>
  </main>;
}
