import type { ReactNode } from "react";

export type HistoryEntry = { key: string; question: string; date: string };
type IconName = "message" | "search" | "saved" | "history" | "data" | "document" | "plus" | "menu" | "arrow" | "shield" | "chevron";
export function ChromeIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    message: <path d="M3 3h18v14H9l-6 4V3Z" />,
    search: <><circle cx="10.5" cy="10.5" r="7.5" /><path d="m16 16 5 5" /></>,
    saved: <path d="M4 2h16v20l-8-5-8 5V2Z" />,
    history: <><circle cx="12" cy="12" r="9" /><path d="M12 6v7l4 2" /></>,
    data: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 4 18 4 18 0V5M3 10c0 4 18 4 18 0M3 15c0 4 18 4 18 0" /></>,
    document: <><path d="M4 3h12l4 4v14H4V3ZM16 3v5h4M8 11h8M8 15h7" /></>,
    plus: <path d="M12 3v18M3 12h18" />,
    menu: <path d="M3 5h18M3 12h18M3 19h18" />,
    arrow: <path d="M3 12h17m-7-7 7 7-7 7" />,
    shield: <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z" /><path d="m7 11 3 3 7-7" /></>,
    chevron: <path d="m6 8 6 10 6-10" />,
  };
  return <svg className="sf-chrome-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function FabricMark({ size = 34 }: { size?: number }) {
  return <svg className="sf-fabric-mark" width={size} height={size} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M18 1v34M1 18h34M6 6l24 24M6 30 30 6" /></svg>;
}
export function Sidebar({ history, activeKey, screen, onHistory, onNew, onAnswer, onData }: {
  history: HistoryEntry[]; activeKey?: string; screen: "new" | "answer";
  onHistory: (key: string) => void; onNew: () => void; onAnswer: () => void; onData: () => void;
}) {
  return <aside className="sf-sidebar" aria-label="検索ワークスペースのナビゲーション">
    <div className="sf-brand"><FabricMark /><span>Search Fabric</span></div>
    <nav className="sf-main-nav" aria-label="ワークスペース">
      <button type="button" className="sf-nav-item sf-nav-current-group" aria-current={screen === "answer" ? "page" : undefined} onClick={onAnswer}><ChromeIcon name="message" /><span>回答と出典</span></button>
      <button type="button" className="sf-nav-item" onClick={onNew}><ChromeIcon name="search" /><span>検索ワークスペース</span></button>
      <button type="button" className="sf-nav-item" disabled title="永続保存した情報の一覧は未実装です"><ChromeIcon name="saved" /><span>保存した情報</span><span className="sf-nav-unavailable">未実装</span></button>
      <button type="button" className="sf-nav-item" onClick={() => document.getElementById("sf-history-heading")?.focus()}><ChromeIcon name="history" /><span>検索の履歴</span></button>
      <button type="button" className="sf-nav-item" onClick={onData}><ChromeIcon name="data" /><span>データ一覧</span></button>
    </nav>
    <section className="sf-history" aria-labelledby="sf-history-heading">
      <h2 id="sf-history-heading" tabIndex={-1}>最近の検索</h2>
      <div className="sf-history-list" role="region" aria-label="保存された質問の履歴" tabIndex={0}>
        {history.length ? history.map(entry => <button type="button" key={entry.key} className="sf-history-item" data-selected={entry.key === activeKey || undefined} aria-current={screen === "answer" && entry.key === activeKey ? "page" : undefined} onClick={() => onHistory(entry.key)} title={entry.question}>
          <ChromeIcon name="document" size={20} /><span className="sf-history-copy"><span className="sf-history-title">{entry.question}</span><time>{entry.date}</time></span>
        </button>) : <p className="sf-history-empty">保存された質問はありません。</p>}
      </div>
    </section>
    <button type="button" className="sf-new-button" aria-current={screen === "new" ? "page" : undefined} onClick={onNew}><ChromeIcon name="plus" size={26} /><span>新しい検索</span></button>
  </aside>;
}
export function Topbar({ title, onData, onMenu, originLabel }: { title: string; onData: () => void; onMenu: () => void; originLabel?: string }) {
  const isSearch = title === "新しい検索";
  return <header className={`sf-topbar ${isSearch ? "sf-topbar-search" : ""}`}>
    <div className="sf-topbar-heading"><button type="button" className="sf-menu-button" onClick={onMenu} aria-label="ナビゲーションを切り替える"><ChromeIcon name="menu" size={25} /></button><span>{title}</span></div>
    <div className="sf-topbar-actions"><span className="sf-preview-pill"><span aria-hidden="true" />{isSearch ? "デザインプレビュー" : originLabel ?? "合成サンプル"}</span>
      {isSearch ? <span className="sf-offline-label">実検索は未接続</span> : <button type="button" className="sf-data-button" onClick={onData}><ChromeIcon name="data" size={20} />参照データ</button>}
      <span className="sf-profile-mark" aria-label="プレビュー用アバター。ユーザー認証ではありません">S</span>
    </div>
  </header>;
}
