# AGENTS.md — 教育のパタン・ランゲージ Wiki 作業指針

このリポジトリは、教育のパタン・ランゲージ Wiki を Quartz 4 で公開するためのものです。本文 Wiki は Obsidian/Markdown として育て、Quartz 側で公開サイトとして整えます。

## 基本方針

- 本文知識ベースと公開サイト設定を分けて扱う。
- 既存のパタン本文、frontmatter、Wikiリンクは、広範囲に変更する前に作業目的を明確にする。
- ユーザー未確認のまま `content/` 全体を大きく書き換えない。
- Git では意図したファイルだけを stage する。同期ログや一時ファイルは巻き込まない。

## 将来セッションの作業手順（Wiki執筆・整備系）

2026-06 に確立した運用。設計・基準づくりを担ったセッションが残した仕様書に従って、以降のセッションが実装する体制。

**仕様の正（読む順）**:

1. vault の `CLAUDE.md` — スキーマ・公開境界・安全規則（パス: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/CLAUDE.md`）
2. `wiki/メンテナンス/改善ロードマップ.md` — タスクの正＋「実行ガイド（将来セッション向け）」。**統合の実証済み手順**と**新パタン執筆の実証済み手順**（つまずきどころ込み）がここにある
3. vault 直下 `log.md` の表の先頭 — 直近の作業状態

**セッションの進め方**:

- 着手は1セッション1項目。実行ガイドの手順に従い、手順にない判断（境界裁定・統合可否・新規/更新の迷い）は**推測で進めず止めてユーザーに聞く**
- ロードマップの D1〜D8・D16c〜e は「ユーザーからのソース提供・執筆依頼があったときのみ着手」。独断で起草しない
- 作業後は必ず: lint（`cd ~/quartz && node lint-wiki.mjs`）→ ロードマップのチェック更新 → `log.md` に1行追記。日付は `date '+%Y-%m-%d'` で確認してから書く
- lint の合格基準: 非対称=0・リンク切れ=0・重複=0。既存の許容値（⑤文献引用ゼロ=1・⑲孤立リンク=10）より増えていないこと

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

## 編集境界

エージェントの種類（Claude Code / Codex / Cursor）にかかわらず、この境界を守る。

- **本文（`content/`）とサイト設定（`quartz.config.ts` / `quartz.layout.ts` / `quartz/i18n/`）は別の仕事として扱う**。片方の作業中にもう片方を巻き込まない
- サイト設定・レイアウト・デプロイ設定を変更する前に、ユーザー確認を取る
- 既存本文の意味・主張・理論的位置づけを変える編集は、ユーザー確認なしに行わない。本文に手を入れるのは、原則として導線・補足・見出し・リンク・実践例・対応関係の追記にとどめる
- 言い換えが必要な場合も、意味を変えない範囲で最小限にする
- `content/index.md` を編集するときは、目的をトップページ UX に限定する
- 大量編集（lint の一括是正など）に入る前に、対象範囲をユーザーに伝える
- 並行セッションがありうる。同じファイルを触る前に `git status --short` と差分を確認し、他のセッションやユーザーの変更を勝手に戻さない

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

- Quartz 側の本文: `~/quartz/content/`
- Obsidian vault 側: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/`

本文パタン・教科ページを編集した時の基本手順:

1. Quartz 側の `content/` を編集する。
2. リンクチェック・build を通す。
3. 対応する Obsidian vault 側ファイルにも同じ内容を反映する。
4. vault 側で、追加した見出しや主要文言が入っていることを確認する。
5. ユーザーが採用・プッシュを依頼したら、Quartz 側の対象ファイルだけを stage / commit / push する。

注意: `git status` や `git push` では Obsidian vault 側の反映状況は分からない。vault 側は明示的にファイル確認する。

## 引き継ぎに残すもの

セッションを終えるとき、次のセッション（Claude / Codex / Cursor のいずれでも）が拾えるように残す。

本文・lint 側の作業をしたら:

- lint 結果の要約。修正済みファイルと未修正ファイル。
- 壊れたリンク一覧と原因分類。
- frontmatter の表記ゆれ一覧。
- トップページに載せたい分類、親パタン、メタパタンの一覧。

サイト・ビルド側の作業をしたら:

- 公開サイト上で見えた UX 課題。
- トップページで必要になった分類整理。
- Quartz の制約による Markdown 表現の注意点。
- build で出た警告やリンク解決上の問題。
