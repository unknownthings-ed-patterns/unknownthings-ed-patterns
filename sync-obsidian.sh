#!/bin/bash
set -euo pipefail

SRC="/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/"
DST="/Users/iwaiteruhisa/quartz/content/"
REPO="/Users/iwaiteruhisa/quartz"
# Quartz build には Node 22 以上が必要（AGENTS.md 参照）
NODE22="/opt/homebrew/opt/node@22/bin/node"
if [ -z "${NODE_BIN:-}" ]; then
  if [ -x "$NODE22" ]; then
    NODE_BIN="$NODE22"
  else
    NODE_BIN="$(command -v node || true)"
  fi
fi

if [ ! -d "$SRC" ]; then
  echo "Obsidian source directory is not available: $SRC" >&2
  exit 1
fi

if [ -z "$NODE_BIN" ]; then
  echo "node command not found. Set NODE_BIN or fix PATH before syncing." >&2
  exit 1
fi

# iCloudがファイルを退避した状態でrsync --deleteが走ると大量削除になるため、
# mdファイル数が閾値未満なら同期を中断する
MD_COUNT=$(find "$SRC" -name '*.md' | wc -l | tr -d ' ')
MIN_MD_COUNT=1000
if [ "$MD_COUNT" -lt "$MIN_MD_COUNT" ]; then
  echo "wiki/ の md ファイル数が異常に少ない（$MD_COUNT < $MIN_MD_COUNT）。iCloudの同期状態を確認してください。同期を中断します。" >&2
  exit 1
fi

# launchd実行時はcwdが / になるため、相対パスのスクリプトが動くようリポジトリへ移動
cd "$REPO"

# リンク整合性を修正（rsync 前に実行）
"$REPO/run-all-fixes.sh"

# クラスター図を自動生成（<!-- cluster: manual --> のあるファイルはスキップ）
"$NODE_BIN" generate-cluster-diagrams.mjs

# lintチェック → wiki/メンテナンス/lint-report.md に書き出し
"$NODE_BIN" lint-wiki.mjs

# ネットワーク中心性レポート → wiki/メンテナンス/network-report.md に書き出し
"$NODE_BIN" network-report.mjs

# ObsidianのwikiをQuartzのcontentに同期（削除も反映）
rsync -a --delete \
  --exclude='.obsidian' \
  --exclude='.DS_Store' \
  --exclude='困りごとから探す.md' \
  --exclude='目標から探す.md' \
  --exclude='パタン名インデックス.md' \
  --exclude='全パタン一覧.md' \
  --exclude='メンテナンス/' \
  --exclude='log.md' \
  "$SRC" "$DST"

# 変更があればcommitしてpush
cd "$REPO"
# YAMLフロントマターのコロン自動クォート（ビルドエラー防止）
"$NODE_BIN" fix-yaml-colons.mjs
"$NODE_BIN" scripts/normalize-links.mjs
"$NODE_BIN" scripts/pattern-index.mjs
git add content/
if ! git diff --staged --quiet; then
  # push前にローカルでビルド検証（失敗したらcommit/pushしない）
  NPX_BIN="$(dirname "$NODE_BIN")/npx"
  if ! PATH="$(dirname "$NODE_BIN"):$PATH" "$NPX_BIN" quartz build; then
    echo "Quartzビルドに失敗しました。commit/pushを中断します。content/ の変更はステージされたままです。" >&2
    exit 1
  fi
  git commit -m "auto: Obsidianから同期 $(date '+%Y-%m-%d %H:%M')"
  git push origin v4
fi
