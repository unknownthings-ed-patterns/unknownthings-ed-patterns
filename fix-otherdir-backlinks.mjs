/**
 * fix-otherdir-backlinks.mjs
 * 学級経営・特別支援・教科ページがリンクしているパタン/文献に逆参照を追加する。
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const DRY_RUN = process.argv.includes('--dry-run')

const VAULT   = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'
const BUNKEN  = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/文献'
const GAKKYU  = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/学級経営'
const TOKUSHI = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/特別支援'
const KYOKA   = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/教科'

const patternNames = new Set(readdirSync(VAULT).filter(f => f.endsWith('.md') && f !== 'index.md').map(f => f.replace(/\.md$/, '')))
const bunkenFiles  = readdirSync(BUNKEN).filter(f => f.endsWith('.md') && f !== 'index.md' && f !== '文献.md' && !f.endsWith('.pdf'))
const bunkenNames  = new Set(bunkenFiles.map(f => f.replace(/\.md$/, '')))

// パタンに追加すべき逆リンク: Map<pname, ["学級経営/X", ...]>
const patternToAdd = new Map()
// 文献に追加すべき逆リンク: Map<bname, ["学級経営/X", ...]>
const bunkenToAdd  = new Map()

for (const [dirPath, prefix] of [[GAKKYU, '学級経営/'], [TOKUSHI, '特別支援/'], [KYOKA, '教科/']]) {
  const dirFiles = readdirSync(dirPath).filter(f => f.endsWith('.md') && f !== 'index.md')
  for (const fname of dirFiles) {
    const pname = fname.replace(/\.md$/, '')
    const content = readFileSync(join(dirPath, fname), 'utf8')

    // パタン逆参照
    const pLinks = [...new Set([...content.matchAll(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim()))]
    for (const target of pLinks) {
      if (!patternNames.has(target)) continue
      const patContent = readFileSync(join(VAULT, `${target}.md`), 'utf8')
      if (!patContent.includes(`[[${prefix}${pname}]]`)) {
        if (!patternToAdd.has(target)) patternToAdd.set(target, [])
        patternToAdd.get(target).push(prefix + pname)
      }
    }

    // 文献逆参照
    const bLinks = [...new Set([...content.matchAll(/\[\[文献\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim()))]
    for (const bname of bLinks) {
      if (!bunkenNames.has(bname)) continue
      const bunContent = readFileSync(join(BUNKEN, `${bname}.md`), 'utf8')
      if (!bunContent.includes(`[[${prefix}${pname}]]`)) {
        if (!bunkenToAdd.has(bname)) bunkenToAdd.set(bname, [])
        bunkenToAdd.get(bname).push(prefix + pname)
      }
    }
  }
}

const totalPat = [...patternToAdd.values()].reduce((s,a) => s+a.length, 0)
const totalBun = [...bunkenToAdd.values()].reduce((s,a) => s+a.length, 0)
console.log(`パタン側: ${patternToAdd.size} ファイル ${totalPat} 件 / 文献側: ${bunkenToAdd.size} ファイル ${totalBun} 件`)

let edited = 0

// パタンファイルに追加
for (const [pname, links] of patternToAdd) {
  const fpath = join(VAULT, `${pname}.md`)
  let content = readFileSync(fpath, 'utf8')
  const real = links.filter(l => !content.includes(`[[${l}]]`))
  if (real.length === 0) continue
  const linksToAdd = real.sort((a,b) => a.localeCompare(b,'ja')).map(l => `- [[${l}]]`).join('\n')
  const kanren = /^## 関連パタン/m
  const tsunagari = /^## パタンのつながり/m
  if (kanren.test(content) || tsunagari.test(content)) {
    const header = kanren.test(content) ? '## 関連パタン' : '## パタンのつながり'
    content = content.replace(
      new RegExp('(^' + header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?)(\\n^##|\\n?$)', 'm'),
      (_, sec, end) => `${sec.trimEnd()}\n${linksToAdd}${end}`)
  } else {
    content = content.trimEnd() + `\n\n## 関連パタン\n\n${linksToAdd}\n`
  }
  if (!DRY_RUN) writeFileSync(fpath, content, 'utf8')
  edited++
  console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}✓ パタン/${pname} (+${real.length})`)
}

// 文献ファイルに追加
for (const [bname, links] of bunkenToAdd) {
  const fpath = join(BUNKEN, `${bname}.md`)
  let content = readFileSync(fpath, 'utf8')
  const real = links.filter(l => !content.includes(`[[${l}]]`))
  if (real.length === 0) continue
  const linksToAdd = real.sort((a,b) => a.localeCompare(b,'ja')).map(l => `- [[${l}]]`).join('\n')
  const wikiSection = /^## 関連するWikiページ/m
  const kanren = /^## 関連パタン/m
  if (wikiSection.test(content)) {
    content = content.replace(/(^## 関連するWikiページ[\s\S]*?)(\n^##|\n?$)/m,
      (_, sec, end) => `${sec.trimEnd()}\n${linksToAdd}${end}`)
  } else if (kanren.test(content)) {
    content = content.replace(/(^## 関連パタン[\s\S]*?)(\n^##|\n?$)/m,
      (_, sec, end) => `${sec.trimEnd()}\n${linksToAdd}${end}`)
  } else {
    content = content.trimEnd() + `\n\n## 関連するWikiページ\n\n${linksToAdd}\n`
  }
  if (!DRY_RUN) writeFileSync(fpath, content, 'utf8')
  edited++
  console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}✓ 文献/${bname} (+${real.length})`)
}

console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}完了: ${edited} ファイルを更新しました。`)
