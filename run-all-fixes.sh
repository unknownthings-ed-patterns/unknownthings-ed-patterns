#!/bin/bash
# run-all-fixes.sh
# 既存リンクに基づく逆参照追加だけを順に実行する。
# デフォルトは dry-run。実際に書き換える場合だけ --apply を付ける。

set -euo pipefail
NODE_BIN="${NODE_BIN:-$(command -v node)}"
cd "$(dirname "$0")"

WIKI_BASE="/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki"

APPLY=false
FIX_ARGS=()
for arg in "$@"; do
  if [ "$arg" = "--apply" ]; then
    APPLY=true
  elif [ "$arg" != "--dry-run" ]; then
    FIX_ARGS+=("$arg")
  fi
done

if [ "$APPLY" = false ]; then
  FIX_ARGS=(--dry-run)
  echo "dry-run: Obsidian vault は書き換えません。実行する場合は --apply を付けてください。"
  echo ""
fi

echo "対象: 既存リンクに基づく逆参照追加のみ"
echo "除外: 孤立リンク移動、引用対応表による文献追加、出典セクション追加"
echo ""

# 実書き換えのときだけ、可能なら事前スナップショットを作成する。
if [ "$APPLY" = true ] && git -C "$WIKI_BASE" rev-parse --git-dir > /dev/null 2>&1; then
  git -C "$WIKI_BASE" add -A
  if ! git -C "$WIKI_BASE" diff --staged --quiet; then
    git -C "$WIKI_BASE" commit -m "pre-fix $(date '+%Y-%m-%d %H:%M')"
    echo "Vault: pre-fix スナップショット作成"
  fi
fi


echo "=== [1/5] ハブパタン逆参照 (fix-hub-backlinks) ==="
"$NODE_BIN" fix-hub-backlinks.mjs ${FIX_ARGS[@]+"${FIX_ARGS[@]}"}

echo ""
echo "=== [2/5] 文献→Wiki逆参照 (fix-bunken-backlinks) ==="
"$NODE_BIN" fix-bunken-backlinks.mjs ${FIX_ARGS[@]+"${FIX_ARGS[@]}"}

echo ""
echo "=== [3/5] 実践→パタン逆参照 (fix-jissen-backlinks) ==="
"$NODE_BIN" fix-jissen-backlinks.mjs ${FIX_ARGS[@]+"${FIX_ARGS[@]}"}

echo ""
echo "=== [4/5] 概念→パタン逆参照 (fix-gainen-backlinks) ==="
"$NODE_BIN" fix-gainen-backlinks.mjs ${FIX_ARGS[@]+"${FIX_ARGS[@]}"}

echo ""
echo "=== [5/5] 他Dir→パタン/文献逆参照 (fix-otherdir-backlinks) ==="
"$NODE_BIN" fix-otherdir-backlinks.mjs ${FIX_ARGS[@]+"${FIX_ARGS[@]}"}

echo ""
if [ "$APPLY" = true ]; then
  echo "=== lint チェック ==="
  "$NODE_BIN" lint-wiki.mjs
else
  echo "dry-run 完了。lint-report の書き換えを避けるため lint-wiki.mjs は実行していません。"
fi
