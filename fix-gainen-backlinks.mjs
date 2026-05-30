/**
 * fix-gainen-backlinks.mjs
 * パタンページが [[概念/X]] にリンクしているが、概念X に [[パタン/Y]] がないケースを修正する。
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const DRY_RUN = process.argv.includes('--dry-run')

const VAULT  = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'
const GAINEN = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/概念'

const gainenFiles = readdirSync(GAINEN).filter(f => f.endsWith('.md') && f !== 'index.md')
const gainenNames = new Set(gainenFiles.map(f => f.replace(/\.md$/, '')))
const patternFiles = readdirSync(VAULT).filter(f => f.endsWith('.md') && f !== 'index.md')

// 概念ページ → 追加すべき [[パタン/X]] のリスト
const toAdd = new Map()
for (const fname of patternFiles) {
  const pname = fname.replace(/\.md$/, '')
  const content = readFileSync(join(VAULT, fname), 'utf8')
  const gLinks = [...new Set([...content.matchAll(/\[\[概念\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim()))]
  for (const gname of gLinks) {
    if (!gainenNames.has(gname)) continue
    const gainenContent = readFileSync(join(GAINEN, `${gname}.md`), 'utf8')
    if (!gainenContent.includes(`[[パタン/${pname}]]`)) {
      if (!toAdd.has(gname)) toAdd.set(gname, [])
      toAdd.get(gname).push(pname)
    }
  }
}

console.log(`修正対象: ${toAdd.size} 概念ファイル、合計 ${[...toAdd.values()].reduce((s,a) => s+a.length, 0)} 件`)

let edited = 0
for (const [gname, patterns] of toAdd) {
  const fpath = join(GAINEN, `${gname}.md`)
  let content = readFileSync(fpath, 'utf8')

  const reallyMissing = patterns.filter(p => !content.includes(`[[パタン/${p}]]`))
  if (reallyMissing.length === 0) continue

  const linksToAdd = reallyMissing.sort((a,b) => a.localeCompare(b,'ja')).map(p => `- [[パタン/${p}]]`).join('\n')

  // 関連するWikiページ・関連パタン セクションがあればそこへ、なければ末尾に追加
  const wikiSection   = /^## 関連するWikiページ/m
  const kanrenSection = /^## 関連パタン/m

  if (wikiSection.test(content)) {
    content = content.replace(/(^## 関連するWikiページ[\s\S]*?)(\n^##|\n?$)/m,
      (_, sec, end) => `${sec.trimEnd()}\n${linksToAdd}${end}`)
  } else if (kanrenSection.test(content)) {
    content = content.replace(/(^## 関連パタン[\s\S]*?)(\n^##|\n?$)/m,
      (_, sec, end) => `${sec.trimEnd()}\n${linksToAdd}${end}`)
  } else {
    content = content.trimEnd() + `\n\n## 関連するWikiページ\n\n${linksToAdd}\n`
  }

  if (!DRY_RUN) writeFileSync(fpath, content, 'utf8')
  edited++
  console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}✓ ${gname} (+${reallyMissing.length})`)
}

console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}完了: ${edited} ファイルを更新しました。`)
