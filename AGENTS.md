# AGENTS.md — 教育のパタン・ランゲージ Wiki 作業分担

このリポジトリは、教育のパタン・ランゲージ Wiki を Quartz 4 で公開するためのものです。本文 Wiki は Obsidian/Markdown として育て、Quartz 側で公開サイトとして整えます。

## 基本方針

- 本文知識ベースと公開サイト設定を分けて扱う。
- 既存のパタン本文、frontmatter、Wikiリンクは、広範囲に変更する前に作業目的を明確にする。
- ユーザー未確認のまま `content/` 全体を大きく書き換えない。
- Git では意図したファイルだけを stage する。同期ログや一時ファイルは巻き込まない。

## 主なディレクトリ

- `content/`: 公開される Markdown Wiki 本体。
- `content/index.md`: サイトトップページ。初見者向け導線と Wiki 地図を置く。
- `content/パタン/`: パタン・ランゲージ本体。
- `content/メタパタン/`: パタン群の上位概念。
- `content/概念/`: 用語・概念ページ。
- `content/文献/`: 文献・動画記録。
- `quartz.config.ts`: Quartz のサイト名、locale、フォント、テーマ、プラグイン設定。
- `quartz.layout.ts`: ヘッダー、サイドバー、フッターなどの配置。
- `quartz/i18n/locales/ja-JP.ts`: 日本語 UI 文言。

## 役割分担

### クロコ担当

クロコは主に Wiki 本文と知識ベースの整備を担当する。

- `content/` 配下の本文 lint。
- frontmatter の整備。
- `type`, `tags`, `updated`, `related`, `source/sources` の表記ゆれ確認。
- 壊れた Wikiリンクの修正。
- パタンファイルの標準構造の確認。
- `## Actionable Insight` など、本文構造の整合性確認。
- `content/index.md` に関わる本文分類やパタン一覧の情報提供。
- lint 結果、修正履歴、未解決課題の引き継ぎ。

### Codex 担当

Codex は主に Quartz 側、公開サイト UX、ビルド確認を担当する。

- `quartz.config.ts` の改善。
- サイト名、locale、日本語 UI、フォント、テーマの調整。
- `quartz.layout.ts` とフッターなどサイトシェルの調整。
- `content/index.md` のトップページ UX 改善。
- 初見者向け導線、カテゴリ構成、情報階層の提案。
- lint 結果を受けた修正優先順位づけ。
- Quartz build/preview の確認。
- Git commit/push。ただしユーザーが明示的に依頼した場合のみ push する。

## 編集境界

- クロコが本文 lint 中のとき、Codex は `content/` 配下の大量編集を避ける。
- Codex が `content/index.md` を編集する場合は、トップページ UX に目的を限定する。
- クロコは Quartz 設定、レイアウト、デプロイ設定を変更する前にユーザー確認を取る。
- 同じファイルを両者が触る場合は、先に `git status` と差分を確認する。
- 既存のユーザー変更や他エージェント変更を勝手に戻さない。

## Frontmatter の現状メモ

主な型:

- `pattern`
- `concept`
- `practice`
- `literature`
- `meta-pattern`
- `reference`
- `video-note`
- `subject-hub`
- `note`

既知の表記ゆれ:

- `動画記録` は `video-note` へ統一候補。

パタンファイルの標準構造:

```markdown
---
type: pattern
tags: [パタン, <カテゴリ>, ...]
updated: YYYY-MM-DD
---

# パタン名

> 引用文

## 背景（Context）
## 問題（Problem）
## 力のかたち（Forces）
## 解決（Solution）
## 結果（Consequences）
## 関連パタン
## Actionable Insight
## 出典
```

## ローカル確認

Quartz は Node 22 以上が必要。通常の `node` が古い場合は以下を使う。

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH /opt/homebrew/opt/node@22/bin/npx quartz build
```

ローカルプレビュー:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH /opt/homebrew/opt/node@22/bin/npx quartz build --serve --port 8080
```

確認 URL:

```text
http://localhost:8080/
```

## Git とデプロイ

- ブランチ: `v4`
- GitHub Pages は push 後に GitHub Actions で反映される。
- push はユーザーが「プッシュして」と明示した場合のみ行う。
- stage する前に必ず `git status --short` を見る。
- `sync-error.log`, `sync.log`, `sync-obsidian.sh` など未追跡の同期関連ファイルは、ユーザーが明示しない限り commit に含めない。

## 引き継ぎの流れ

クロコから Codex へ渡すとよいもの:

- lint 結果の要約。
- 修正済みファイルと未修正ファイル。
- 壊れたリンク一覧と原因分類。
- frontmatter の表記ゆれ一覧。
- トップページに載せたい分類、親パタン、メタパタンの一覧。

Codex からクロコへ渡すとよいもの:

- 公開サイト上で見えた UX 課題。
- トップページで必要になった分類整理。
- Quartz の制約による Markdown 表現の注意点。
- build で出た警告やリンク解決上の問題。

