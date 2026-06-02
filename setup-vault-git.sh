#!/bin/bash
# setup-vault-git.sh
# Obsidian WikiディレクトリにGitを初期化する（初回のみ実行）。
# run-all-fixes.sh が pre-fix スナップショットを取れるようになる。

set -euo pipefail

WIKI="/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki"

if git -C "$WIKI" rev-parse --git-dir > /dev/null 2>&1; then
  echo "Wiki ディレクトリは既に git 管理されています。"
  git -C "$WIKI" log --oneline -5
  exit 0
fi

cd "$WIKI"
git init

cat > .gitignore << 'GITIGNORE'
*.pdf
.DS_Store
GITIGNORE

git add .
git commit -m "initial: Wiki スナップショット $(date '+%Y-%m-%d')"

echo ""
echo "Wiki の git 管理を開始しました。"
echo "以降、run-all-fixes.sh 実行前に自動的にスナップショットが作成されます。"
echo "ロールバックは: git -C \"$WIKI\" checkout -- ."
