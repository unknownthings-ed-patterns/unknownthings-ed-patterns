/**
 * fix-bunken-backlinks.mjs
 * 文献ページに欠落している [[パタン/X]] [[実践/X]] [[概念/X]] 逆参照を追加する。
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const DRY_RUN = process.argv.includes('--dry-run')

const VAULT  = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'
const BUNKEN = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/文献'
const JISSEN = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/実践'
const GAINEN = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/概念'

const patternFiles = readdirSync(VAULT).filter(f => f.endsWith('.md') && f !== 'index.md')
const jissenFiles  = readdirSync(JISSEN).filter(f => f.endsWith('.md') && f !== 'index.md')
const gainenFiles  = readdirSync(GAINEN).filter(f => f.endsWith('.md') && f !== 'index.md')
const bunkenFiles  = readdirSync(BUNKEN).filter(f => f.endsWith('.md') && f !== 'index.md' && f !== '文献.md' && !f.endsWith('.pdf'))
const bunkenNames  = new Set(bunkenFiles.map(f => f.replace(/\.md$/, '')))

// 文献ページが現在持つ逆リンクを収集
const bunkenBackLinks = new Map() // 文献名 → Set<"パタン/X" | "実践/X" | "概念/X">
for (const bfname of bunkenFiles) {
  const bname = bfname.replace(/\.md$/, '')
  const bcontent = readFileSync(join(BUNKEN, bfname), 'utf8')
  const set = new Set()
  for (const m of bcontent.matchAll(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)) set.add('パタン/' + m[1].trim())
  for (const m of bcontent.matchAll(/\[\[実践\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g))  set.add('実践/' + m[1].trim())
  for (const m of bcontent.matchAll(/\[\[概念\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g))  set.add('概念/' + m[1].trim())
  bunkenBackLinks.set(bname, set)
}

// 各ソースディレクトリから [[文献/X]] リンクを収集
// bunkenToPages: 文献名 → Set<"パタン/X" | "実践/X" | "概念/X">
const bunkenToPages = new Map()

function collect(files, dirPath, prefix) {
  for (const fname of files) {
    const pname = fname.replace(/\.md$/, '')
    const content = readFileSync(join(dirPath, fname), 'utf8')
    const bLinks = [...content.matchAll(/\[\[文献\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim())
    for (const bname of bLinks) {
      if (!bunkenNames.has(bname)) continue
      if (!bunkenToPages.has(bname)) bunkenToPages.set(bname, new Set())
      bunkenToPages.get(bname).add(prefix + pname)
    }
  }
}

collect(patternFiles, VAULT,  'パタン/')
collect(jissenFiles,  JISSEN, '実践/')
collect(gainenFiles,  GAINEN, '概念/')

// 欠落している逆参照を計算
const toAdd = new Map() // 文献名 → ["パタン/X", ...]
for (const [bname, pages] of bunkenToPages) {
  const existing = bunkenBackLinks.get(bname) ?? new Set()
  // ファイル全体で既存リンクを確認（冪等性）
  const rawContent = readFileSync(join(BUNKEN, `${bname}.md`), 'utf8')
  const missing = [...pages].filter(p => !existing.has(p) && !rawContent.includes(`[[${p}]]`)).sort((a, b) => a.localeCompare(b, 'ja'))
  if (missing.length > 0) toAdd.set(bname, missing)
}

console.log(`修正対象: ${toAdd.size} 文献ファイル、合計 ${[...toAdd.values()].reduce((s, a) => s + a.length, 0)} 件の欠落`)

// 各文献ファイルを修正
let edited = 0
for (const [bname, pages] of toAdd) {
  const fpath = join(BUNKEN, `${bname}.md`)
  let content = readFileSync(fpath, 'utf8')

  const linksToAdd = pages.map(p => `- [[${p}]]`).join('\n')

  const wikiSection   = /^## 関連するWikiページ/m
  const patternSection = /^## 関連パタン/m

  if (wikiSection.test(content)) {
    content = content.replace(/(^## 関連するWikiページ[\s\S]*?)(\n^##|\n?$)/m, (_, sec, end) => {
      return `${sec.trimEnd()}\n${linksToAdd}${end}`
    })
  } else if (patternSection.test(content)) {
    content = content.replace(/(^## 関連パタン[\s\S]*?)(\n^##|\n?$)/m, (_, sec, end) => {
      return `${sec.trimEnd()}\n${linksToAdd}${end}`
    })
  } else {
    content = content.trimEnd() + `\n\n## 関連するWikiページ\n\n${linksToAdd}\n`
  }

  if (!DRY_RUN) writeFileSync(fpath, content, 'utf8')
  edited++
  console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}✓ ${bname} (+${pages.length})`)
}

console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}完了: ${edited} ファイルを更新しました。`)
