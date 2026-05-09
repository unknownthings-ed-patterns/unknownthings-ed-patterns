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
- クロコが生成・整理した本文の意味を、ユーザー確認なしに大きく変えない。Codex が本文に手を入れる場合は、原則として導線、補足、見出し、リンク、実践例、対応関係の追記にとどめる。
- 既存本文の言い換えが必要な場合も、意味・主張・理論的位置づけを変えない範囲で最小限にする。

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

### 実践パタンと親パタンの双方向リンク方針

実践レベルのパタンと親・中位レベルのパタンは、抽象と具体を行き来できるように対応づける。

- 実践パタン側には `## 圧縮されているパタン` を置く。
  - その実践の中に、どの親パタン・中位パタンが畳み込まれているかを書く。
  - 例: `ナンバートーク` には `考える文化`、`可視化`、`沈黙の間の設計`、`間違いや失敗から学ぶ文化` などが圧縮されている。
- 親パタン・中位パタン側には `## このパタンが働く実践` を置く。
  - そのパタンが、どの具体的な実践パタンの中で働いているかを書く。
  - 例: `可視化` には `ナンバートーク`、`数学語彙の文脈的指導`、`図に表せないか` などを置く。

この対応は、実践から理論へ上がる導線と、理論から実践へ降りる導線を作るためのもの。新しい実践パタンを追加・整理するときは、可能であれば両方向の記述をそろえる。

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

## Obsidian vault 反映チェック

本文 Wiki の正本に近いものは Obsidian vault 側にもあるため、`content/` の本文パタンや教科ページを編集した場合は、作業チェックに vault 反映を含める。

- Quartz 側の本文: `/Users/iwaiteruhisa/quartz/content/`
- Obsidian vault 側: `/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/`

本文パタン・教科ページを編集した時の基本手順:

1. Quartz 側の `content/` を編集する。
2. リンクチェック・build を通す。
3. 対応する Obsidian vault 側ファイルにも同じ内容を反映する。
4. vault 側で、追加した見出しや主要文言が入っていることを確認する。
5. ユーザーが採用・プッシュを依頼したら、Quartz 側の対象ファイルだけを stage / commit / push する。

注意: `git status` や `git push` では Obsidian vault 側の反映状況は分からない。vault 側は明示的にファイル確認する。

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
