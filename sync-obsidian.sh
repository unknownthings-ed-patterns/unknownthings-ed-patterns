#!/bin/bash

SRC="/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/"
DST="/Users/iwaiteruhisa/quartz/content/"

# ObsidianのwikiをQuartzのcontentに同期（削除も反映）
rsync -a --delete \
  --exclude='.obsidian' \
  --exclude='.DS_Store' \
  --exclude='index.md' \
  "$SRC" "$DST"

# 変更があればcommitしてpush
cd /Users/iwaiteruhisa/quartz
git add content/
if ! git diff --staged --quiet; then
  git commit -m "auto: Obsidianから同期 $(date '+%Y-%m-%d %H:%M')"
  git push origin v4
fi
