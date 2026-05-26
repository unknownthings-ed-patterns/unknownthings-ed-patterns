#!/bin/bash
set -euo pipefail

SRC="/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/"
DST="/Users/iwaiteruhisa/quartz/content/"
REPO="/Users/iwaiteruhisa/quartz"
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"

if [ ! -d "$SRC" ]; then
  echo "Obsidian source directory is not available: $SRC" >&2
  exit 1
fi

if [ -z "$NODE_BIN" ]; then
  echo "node command not found. Set NODE_BIN or fix PATH before syncing." >&2
  exit 1
fi

# クラスター図を自動生成（<!-- cluster: manual --> のあるファイルはスキップ）
"$NODE_BIN" generate-cluster-diagrams.mjs

# lintチェック → wiki/メンテナンス/lint-report.md に書き出し
"$NODE_BIN" lint-wiki.mjs

# ObsidianのwikiをQuartzのcontentに同期（削除も反映）
rsync -a --delete \
  --exclude='.obsidian' \
  --exclude='.DS_Store' \
  --exclude='/index.md' \
  --exclude='困りごとから探す.md' \
  --exclude='目標から探す.md' \
  --exclude='パタン名インデックス.md' \
  --exclude='全パタン一覧.md' \
  --exclude='メンテナンス/旧名と現在名.md' \
  --exclude='メンテナンス/主要パタン候補.md' \
  --exclude='メンテナンス/全パタン一覧（メンテナンス）.md' \
  --exclude='メンテナンス/lint-report.md' \
  "$SRC" "$DST"

# 変更があればcommitしてpush
cd "$REPO"
"$NODE_BIN" scripts/normalize-links.mjs
"$NODE_BIN" scripts/pattern-index.mjs
git add content/
if ! git diff --staged --quiet; then
  git commit -m "auto: Obsidianから同期 $(date '+%Y-%m-%d %H:%M')"
  git push origin v4
fi
