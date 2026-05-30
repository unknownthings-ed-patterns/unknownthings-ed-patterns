/**
 * fix-jissen-backlinks.mjs
 * 実践ページが [[パタン/X]] にリンクしているが、パタンX に [[実践/Y]] がないケースを修正する。
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const DRY_RUN = process.argv.includes('--dry-run')

const VAULT  = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'
const JISSEN = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/実践'

const patternNames = new Set(readdirSync(VAULT).filter(f => f.endsWith('.md') && f !== 'index.md').map(f => f.replace(/\.md$/, '')))
const jissenFiles  = readdirSync(JISSEN).filter(f => f.endsWith('.md') && f !== 'index.md')

// パタン → 追加すべき実践ページ名[]
const toAdd = new Map()
for (const fname of jissenFiles) {
  const jname = fname.replace(/\.md$/, '')
  const content = readFileSync(join(JISSEN, fname), 'utf8')
  const pLinks = [...new Set([...content.matchAll(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim()))]
  for (const pname of pLinks) {
    if (!patternNames.has(pname)) continue
    const patContent = readFileSync(join(VAULT, `${pname}.md`), 'utf8')
    if (!patContent.includes(`[[実践/${jname}]]`)) {
      if (!toAdd.has(pname)) toAdd.set(pname, [])
      toAdd.get(pname).push(jname)
    }
  }
}

console.log(`修正対象: ${toAdd.size} パタン、合計 ${[...toAdd.values()].reduce((s,a) => s+a.length, 0)} 件`)

let edited = 0
for (const [pname, jissens] of toAdd) {
  const fpath = join(VAULT, `${pname}.md`)
  let content = readFileSync(fpath, 'utf8')

  // 冪等性: ファイル全体で既存リンクを除外
  const reallyMissing = jissens.filter(j => !content.includes(`[[実践/${j}]]`))
  if (reallyMissing.length === 0) continue

  const linksToAdd = reallyMissing.sort((a, b) => a.localeCompare(b, 'ja')).map(j => `- [[実践/${j}]]`).join('\n')

  // 「このパタンが働く実践」セクションがあればそこへ、なければ 関連パタン へ、どちらもなければ末尾に追加
  const jissenSection  = /^## このパタンが働く実践/m
  const kanrenSection  = /^## 関連パタン/m
  const tsunagariSection = /^## パタンのつながり/m

  if (jissenSection.test(content)) {
    content = content.replace(/(^## このパタンが働く実践[\s\S]*?)(\n^##|\n?$)/m,
      (_, sec, end) => `${sec.trimEnd()}\n${linksToAdd}${end}`)
  } else if (kanrenSection.test(content) || tsunagariSection.test(content)) {
    const header = kanrenSection.test(content) ? '## 関連パタン' : '## パタンのつながり'
    content = content.replace(
      new RegExp('(^' + header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?)(\\n^##|\\n?$)', 'm'),
      (_, sec, end) => `${sec.trimEnd()}\n${linksToAdd}${end}`)
  } else {
    content = content.trimEnd() + `\n\n## 関連実践\n\n${linksToAdd}\n`
  }

  if (!DRY_RUN) writeFileSync(fpath, content, 'utf8')
  edited++
  console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}✓ ${pname} (+${reallyMissing.length})`)
}

console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}完了: ${edited} ファイルを更新しました。`)
