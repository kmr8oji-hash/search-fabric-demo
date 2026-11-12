import { ProviderResults } from "./ProviderResults";
import "./portfolioDemo.css";

export function PortfolioDemo() {
  return <div className="portfolio-demo">
    <header className="demo-banner" aria-label="デモの実行境界">
      <strong>DEMO / SYNTHETIC / NO LIVE SEARCH</strong>
      <span>合成データだけで操作できます。Provider切替・障害シナリオ・出典パネルをお試しください。</span>
      <small>Grok / X Search: 正式MVP対象・Tavily受入後に実装予定。実API・AI生成・請求はありません。</small>
    </header>
    <ProviderResults portfolioDemo />
  </div>;
}
