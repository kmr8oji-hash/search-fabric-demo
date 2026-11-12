# Search Fabric — Synthetic Demo

検索サービスごとの結果・取得順・出典を確認できる、React製の操作可能なポートフォリオデモです。

**DEMO / SYNTHETIC / NO LIVE SEARCH**

## 試せること

- Tavily / Exa / Perplexityの合成結果をProvider別に切替
- CitationとUNVERIFIED、Usage UNKNOWNの表示
- 一部失敗・Native利用不可・長い抜粋など4つのシナリオ
- Desktop / Tablet / Mobileのレイアウト

データは同梱の自作合成fixtureのみです。実検索・Backend・認証・AI生成はありません。画面の金額とUsageは合成値です。
Tavilyのみ合成Native、Exa/PerplexityはLEGACY_NORMALIZED_ONLYです。自動融合・横断再順位付け・自動要約は行いません。

## ローカル実行

Node.js 24.18.0を使用します。

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
npm run preview
```

http://127.0.0.1:5286/ と http://127.0.0.1:5286/portfolio-demo.html の両方で閲覧できます。
ビルドはViteから2つのHTMLを生成し、配信物はdist/に出力します。.envや実行時設定、Core Worktreeは不要です。通信はCSPのconnect-src noneで禁止しています。

## 実装

React 19 / TypeScript / Vite。Provider別の識別空間、Native payloadのSHA-256確認、部分失敗の分離を備えます。
このRepositoryはSearch Fabric全体から選別したデモ専用ソースです。Python/Core、CostGuardの実運用、実Provider通信は含みません。
Grok/X SearchはSearch Fabricの正式MVP対象で、Tavily実検索受入後に実装予定です。このデモでは未実装です。

## ライセンス

このデモ専用ソースはMIT Licenseです。[LICENSE](LICENSE)を参照してください。
この許諾をSearch Fabric全体やCoreへ拡張しません。第三者の権利・許諾は[THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)に従います。
Web配信物にもLICENSE.txtとTHIRD_PARTY_NOTICES.txtを含みます。
