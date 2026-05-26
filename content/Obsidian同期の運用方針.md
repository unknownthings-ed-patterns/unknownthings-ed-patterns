---
title: Obsidian同期の運用方針
type: maintenance
tags: [メンテナンス, Obsidian, Quartz, 同期]
updated: 2026-05-26
---

# Obsidian同期の運用方針

このWikiは、Obsidian vault と Quartz 公開用 `content/` の両方で編集される。同期事故を防ぐため、同期方向と責任範囲を明確にする。

## 基本方針

- Obsidianの `wiki/` を主な執筆場所とする。
- Quartzの `content/` は公開・生成・検証の場所とする。
- Quartz側で手作業編集したページは、Obsidian側にも同じ内容をコピーしてから運用を続ける。
- `sync-obsidian.sh` は Obsidian から Quartz への一方向同期である。
- `rsync --delete` を使うため、Obsidian側に存在しないQuartz側ファイルは削除されうる。

## Quartz側で管理するページ

次のようなページは、公開用ナビゲーションや自動生成に近いため、Quartz側で編集されることがある。

- [[index]]
- [[パタン名インデックス]]
- [[全パタン一覧]]
- [[メンテナンス/主要パタン候補]]
- [[メンテナンス/全パタン一覧（メンテナンス）]]

Quartz側で編集した場合は、Obsidianにもコピーするか、同期スクリプトの除外対象にする。

## 手作業編集後の確認

1. Quartz側で編集する。
2. `npm run check:wikilinks` を実行する。
3. `npm run check:pattern-index` を実行する。
4. 必要なファイルをObsidian側へコピーする。
5. Quartz側とObsidian側の内容一致を確認する。
6. `content/` の変更だけをcommitする。

## 注意すること

- `sync-error.log` は同期の失敗ログであり、通常のコンテンツ変更コミットに混ぜない。
- Obsidianへのアクセス権限エラーが出た場合は、同期を止めて原因を確認する。
- `node` が見つからない環境では、生成スクリプトが動かないためcommitしない。
- 自動同期で意図しない削除が起きた場合は、すぐに `git status` と `git diff` を確認する。

## 関連ページ

- [[授業設計テンプレート]]
- [[授業後リフレクションテンプレート]]
- [[パタン作成テンプレート]]
