#!/bin/bash

SRC="/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/"
DST="/Users/iwaiteruhisa/quartz/content/"

# ObsidianのwikiをQuartzのcontentに同期（削除も反映）
rsync -a --delete \
  --exclude='.obsidian' \
  --exclude='.DS_Store' \
  --exclude='index.md' \
  --exclude='困りごとから探す.md' \
  --exclude='目標から探す.md' \
  --exclude='パタン名インデックス.md' \
  --exclude='全パタン一覧.md' \
  --exclude='メンテナンス/旧名と現在名.md' \
  "$SRC" "$DST"

# 変更があればcommitしてpush
cd /Users/iwaiteruhisa/quartz
node scripts/normalize-links.mjs
node scripts/pattern-index.mjs
git add content/
if ! git diff --staged --quiet; then
  git commit -m "auto: Obsidianから同期 $(date '+%Y-%m-%d %H:%M')"
  git push origin v4
fi
