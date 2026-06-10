/**
 * lint-wiki.mjs
 * パタンファイルの品質チェックを行い wiki/メンテナンス/lint-report.md に書き出す。
 *
 * チェック項目:
 *   ① 非対称リンク（A→B だが B→A がない）
 *   ② status:complete なのに Actionable Insight がない
 *   ③ 関連パタンのリンク切れ（リンク先ファイルが存在しない）
 *   ④ frontmatter の tags に「パタン」が含まれない
 *   ⑤ 引用ゼロの文献ページ（どのパタンからも [[文献/X]] されていない）
 *   ⑥ パタン→文献リンクはあるが文献→パタンの逆参照がない
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

const VAULT    = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'
const BUNKEN   = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/文献'
const JISSEN   = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/実践'
const GAINEN   = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/概念'
const GAKKYU   = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/学級経営'
const TOKUSHI  = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/特別支援'
const KYOKA    = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/教科'
const REPORT        = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/メンテナンス/lint-report.md'
const HISTORY_PATH  = '/Users/iwaiteruhisa/quartz/.lint-history.json'

// 全パタンファイル一覧（index.md はナビページのため除外）
const files = readdirSync(VAULT).filter(f => f.endsWith('.md') && f !== 'index.md').sort()
const patternNames = new Set(files.map(f => f.replace(/\.md$/, '')))

// 各ファイルを解析
const data = new Map() // name → { links, status, hasActionable, hasPatternTag }

for (const fname of files) {
  const name = fname.replace(/\.md$/, '')
  const content = readFileSync(join(VAULT, fname), 'utf8')

  // 関連パタン or パタンのつながりセクションのリンクを抽出（末尾セクション対応）
  const sectionIdx = content.search(/^#{2,3}\s*(?:関連パタン|パタンのつながり)/m)
  let links = []
  if (sectionIdx >= 0) {
    const afterHeader = content.indexOf('\n', sectionIdx) + 1
    const bodyAndRest = content.slice(afterHeader)
    const nextSecIdx = bodyAndRest.search(/^#{1,3} /m)
    const section = nextSecIdx >= 0 ? bodyAndRest.slice(0, nextSecIdx) : bodyAndRest
    links = [...section.matchAll(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim())
  }

  const typeM      = content.match(/^type:\s*(\S+)/m)
  const statusM   = content.match(/^status:\s*(\S+)/m)
  const tagsM     = content.match(/^tags:\s*\[([^\]]+)\]/m)
  const updatedM  = content.match(/^updated:\s*(\S+)/m)
  const tagsLineM = content.match(/^tags:\s*(\S.*?)?\s*$/m)
  const dateM     = content.match(/^date:\s*(.+?)?\s*$/m)

  // 重複リンクの検出（Setに入れる前の生リスト）
  const dupLinks = links.filter((l, i) => links.indexOf(l) !== i)

  data.set(name, {
    links: [...new Set(links)],
    dupLinks: [...new Set(dupLinks)],
    rawContent:   content,
    type:         typeM     ? typeM[1]     : null,
    status:       statusM   ? statusM[1]   : null,
    updated:      updatedM  ? updatedM[1]  : null,
    tagsLine:     tagsLineM ? (tagsLineM[1] ?? '').trim() : null,
    dateVal:      dateM     ? (dateM[1] ?? '').trim().replace(/^["']|["']$/g, '') : null,
    hasActionable: /^## Actionable Insight/m.test(content),
    hasPatternTag: tagsM ? tagsM[1].includes('パタン') : false,
  })
}

// ① 非対称リンク
const asymmetric = []
for (const [name, { links }] of data) {
  for (const target of links) {
    if (!patternNames.has(target)) continue
    if (!data.get(target).links.includes(name)) {
      asymmetric.push({ from: name, to: target })
    }
  }
}

// ② complete で Actionable Insight なし
const missingActionable = [...data.entries()]
  .filter(([, d]) => d.status === 'complete' && !d.hasActionable)
  .map(([name]) => name)

// ③ リンク切れ
const brokenLinks = []
for (const [name, { links }] of data) {
  for (const target of links) {
    if (!patternNames.has(target)) brokenLinks.push({ from: name, to: target })
  }
}

// ④ パタンタグなし
const noPatternTag = [...data.entries()]
  .filter(([, d]) => !d.hasPatternTag)
  .map(([name]) => name)

// ⑤⑥ 文献ページとパタンの双方向リンクチェック
const bunkenFiles = readdirSync(BUNKEN).filter(f => f.endsWith('.md') && f !== 'index.md' && f !== '文献.md' && f !== '文献ページテンプレート.md' && !f.endsWith('.pdf'))
const bunkenNames = new Set(bunkenFiles.map(f => f.replace(/\.md$/, '')))

// 文献ページが持つ [[パタン/X]] リンクを収集
const bunkenBackLinks = new Map() // 文献名 → Set<パタン名>
for (const bfname of bunkenFiles) {
  const bname = bfname.replace(/\.md$/, '')
  const bcontent = readFileSync(join(BUNKEN, bfname), 'utf8')
  const pLinks = [...bcontent.matchAll(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim())
  bunkenBackLinks.set(bname, new Set(pLinks))
}

// パタンファイルが持つ [[文献/X]] リンクを収集（全パタン）
const patternToBunken = new Map() // パタン名 → Set<文献名>
const bunkenCitedBy = new Map()   // 文献名 → Set<パタン名>
for (const fname of files) {
  const pname = fname.replace(/\.md$/, '')
  const content = readFileSync(join(VAULT, fname), 'utf8')
  const bLinks = [...content.matchAll(/\[\[文献\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim())
  if (bLinks.length > 0) {
    patternToBunken.set(pname, new Set(bLinks))
    for (const bname of bLinks) {
      if (!bunkenCitedBy.has(bname)) bunkenCitedBy.set(bname, new Set())
      bunkenCitedBy.get(bname).add(pname)
    }
  }
}

// ⑤ 引用ゼロの文献ページ
const uncitedBunken = bunkenFiles
  .map(f => f.replace(/\.md$/, ''))
  .filter(bname => !bunkenCitedBy.has(bname))

// ⑥ パタン→文献リンクはあるが文献→パタンの逆参照がない
const missingBunkenBacklinks = []
for (const [pname, bnames] of patternToBunken) {
  for (const bname of bnames) {
    if (!bunkenNames.has(bname)) continue // 文献ファイル自体が存在しない場合はスキップ
    const backSet = bunkenBackLinks.get(bname) ?? new Set()
    if (!backSet.has(pname)) {
      missingBunkenBacklinks.push({ pattern: pname, bunken: bname })
    }
  }
}

// ⑧ 実践・概念→文献逆参照の欠落
const jissenFiles2 = readdirSync(JISSEN).filter(f => f.endsWith('.md') && f !== 'index.md')
const gainenFiles2 = readdirSync(GAINEN).filter(f => f.endsWith('.md') && f !== 'index.md')

// 文献ページが持つ [[実践/X]] [[概念/X]] リンクを収集
const bunkenWikiLinks = new Map() // 文献名 → Set<"実践/X" | "概念/X">
for (const bfname of bunkenFiles) {
  const bname = bfname.replace(/\.md$/, '')
  const bcontent = readFileSync(join(BUNKEN, bfname), 'utf8')
  const set = new Set()
  for (const m of bcontent.matchAll(/\[\[実践\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g))  set.add('実践/' + m[1].trim())
  for (const m of bcontent.matchAll(/\[\[概念\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g))  set.add('概念/' + m[1].trim())
  bunkenWikiLinks.set(bname, set)
}

const missingWikiBacklinks = []
for (const [dirFiles, dirPath, prefix] of [[jissenFiles2, JISSEN, '実践/'], [gainenFiles2, GAINEN, '概念/']]) {
  for (const fname of dirFiles) {
    const pname = fname.replace(/\.md$/, '')
    const content = readFileSync(join(dirPath, fname), 'utf8')
    const bLinks = [...content.matchAll(/\[\[文献\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim())
    for (const bname of bLinks) {
      if (!bunkenNames.has(bname)) continue
      const existing = bunkenWikiLinks.get(bname) ?? new Set()
      if (!existing.has(prefix + pname)) {
        missingWikiBacklinks.push({ page: prefix + pname, bunken: bname })
      }
    }
  }
}

// ⑪ 重複リンク
const duplicateLinks = []
for (const [name, { dupLinks }] of data) {
  for (const dup of dupLinks) {
    duplicateLinks.push({ from: name, dup })
  }
}

// ⑫ 実践→パタン逆参照の欠落
// 実践ページが [[パタン/X]] にリンクしているが、パタンXのファイルに [[実践/Y]] の逆リンクがない
const jissenFiles3 = readdirSync(JISSEN).filter(f => f.endsWith('.md') && f !== 'index.md')
const missingJissenBacklinks = []
for (const fname of jissenFiles3) {
  const jname = fname.replace(/\.md$/, '')
  const content = readFileSync(join(JISSEN, fname), 'utf8')
  const pLinks = [...content.matchAll(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim())
  for (const pname of [...new Set(pLinks)]) {
    if (!patternNames.has(pname)) continue
    const patContent = readFileSync(join(VAULT, `${pname}.md`), 'utf8')
    if (!patContent.includes(`[[実践/${jname}]]`)) {
      missingJissenBacklinks.push({ pattern: pname, jissen: jname })
    }
  }
}

// ⑬ パタン→概念逆参照の欠落
const gainenFiles3 = readdirSync(GAINEN).filter(f => f.endsWith('.md') && f !== 'index.md')
const gainenNames  = new Set(gainenFiles3.map(f => f.replace(/\.md$/, '')))

// 概念ページが持つ [[パタン/X]] リンクを収集
const gainenPatternLinks = new Map()
for (const fname of gainenFiles3) {
  const gname = fname.replace(/\.md$/, '')
  const gcontent = readFileSync(join(GAINEN, fname), 'utf8')
  const pLinks = [...gcontent.matchAll(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim())
  gainenPatternLinks.set(gname, new Set(pLinks))
}

const missingGainenBacklinks = []
for (const fname of files) {
  const pname = fname.replace(/\.md$/, '')
  const content = readFileSync(join(VAULT, fname), 'utf8')
  const gLinks = [...new Set([...content.matchAll(/\[\[概念\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim()))]
  for (const gname of gLinks) {
    if (!gainenNames.has(gname)) continue
    const existing = gainenPatternLinks.get(gname) ?? new Set()
    if (!existing.has(pname)) {
      missingGainenBacklinks.push({ pattern: pname, gainen: gname })
    }
  }
}

// ⑭ パタン充実度チェック（status:complete なのに必須セクションが欠落）
const incompleteStructure = []
for (const fname of files) {
  const name = fname.replace(/\.md$/, '')
  const d = data.get(name)
  if (d.status !== 'complete') continue
  const content = readFileSync(join(VAULT, fname), 'utf8')
  const missing = []
  if (!/^#{1,3}\s*背景（Context）/m.test(content)) missing.push('背景')
  if (!/^#{1,3}\s*問題（Problem）/m.test(content))  missing.push('問題')
  if (!/^#{1,3}\s*解決（Solution）/m.test(content))  missing.push('解決')
  if (missing.length > 0) incompleteStructure.push({ name, missing })
}

// ⑮ 学級経営・特別支援ページとのリンク整合性
function collectOtherDirMissingBacklinks(dirPath, prefix, patNames, bunNames, bunBackLinks) {
  const dirFiles = readdirSync(dirPath).filter(f => f.endsWith('.md') && f !== 'index.md')
  const missing = []
  for (const fname of dirFiles) {
    const pname = fname.replace(/\.md$/, '')
    const content = readFileSync(join(dirPath, fname), 'utf8')
    // パタン逆参照
    const pLinks = [...new Set([...content.matchAll(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim()))]
    for (const target of pLinks) {
      if (!patNames.has(target)) continue
      const patContent = readFileSync(join(VAULT, `${target}.md`), 'utf8')
      if (!patContent.includes(`[[${prefix}${pname}]]`)) {
        missing.push({ dir: prefix.replace('/',''), page: pname, target, kind: 'パタン' })
      }
    }
    // 文献逆参照
    const bLinks = [...new Set([...content.matchAll(/\[\[文献\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim()))]
    for (const bname of bLinks) {
      if (!bunNames.has(bname)) continue
      const existing = bunBackLinks.get(bname) ?? new Set()
      if (!existing.has(prefix + pname)) {
        missing.push({ dir: prefix.replace('/',''), page: pname, target: bname, kind: '文献' })
      }
    }
  }
  return missing
}

// 文献ページが持つ全逆リンクを収集（既存の bunkenBackLinks を拡張して再利用）
const bunkenAllBackLinks = new Map()
for (const bfname of bunkenFiles) {
  const bname = bfname.replace(/\.md$/, '')
  const bcontent = readFileSync(join(BUNKEN, bfname), 'utf8')
  const set = new Set()
  for (const m of bcontent.matchAll(/\[\[([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)) set.add(m[1].trim())
  bunkenAllBackLinks.set(bname, set)
}

const missingGakkyu  = collectOtherDirMissingBacklinks(GAKKYU,  '学級経営/', patternNames, bunkenNames, bunkenAllBackLinks)
const missingTokushi = collectOtherDirMissingBacklinks(TOKUSHI, '特別支援/', patternNames, bunkenNames, bunkenAllBackLinks)
const missingKyoka   = collectOtherDirMissingBacklinks(KYOKA,   '教科/',    patternNames, bunkenNames, bunkenAllBackLinks)
const missingOtherDir = [...missingGakkyu, ...missingTokushi, ...missingKyoka]

// ⑯ 更新が古いパタン（status:complete で updated が1年以上前）
const _today = new Date().toISOString().slice(0, 10)
const oneYearAgo = new Date(_today)
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
const stalePatterns = [...data.entries()]
  .filter(([, d]) => {
    if (d.status !== 'complete' || !d.updated) return false
    return new Date(d.updated) < oneYearAgo
  })
  .map(([name, d]) => ({ name, updated: d.updated }))
  .sort((a, b) => a.updated.localeCompare(b.updated))

// ⑰ 出典セクションなし（status:complete で ## 出典 がない）
const noSource = [...data.entries()]
  .filter(([, d]) => d.status === 'complete')
  .filter(([name]) => {
    const content = readFileSync(join(VAULT, `${name}.md`), 'utf8')
    return !/^## 出典/m.test(content)
  })
  .map(([name]) => name)
  .sort((a, b) => a.localeCompare(b, 'ja'))

// ⑱ frontmatter 標準化チェック
const frontmatterIssues = []
for (const [name, d] of data) {
  const issues = []
  if (d.dateVal && !/^\d{4}-\d{2}-\d{2}$/.test(d.dateVal)) {
    issues.push(`date: "${d.dateVal}"`)
  }
  if (d.tagsLine && !d.tagsLine.startsWith('[')) {
    issues.push(`tags非配列: "${d.tagsLine}"`)
  }
  if (d.status && !['draft', 'in-progress', 'developing', 'complete'].includes(d.status)) {
    issues.push(`status不正値: "${d.status}"`)
  }
  if (issues.length > 0) frontmatterIssues.push({ name, issues })
}

// ⑲ 関連パタンセクション外の孤立パタンリンク（bullet形式 - [[パタン/X]]）
const orphanedLinkPatterns = []
const bulletLinkRE = /^- \[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\](?:\s+[—–\-].*)?$/gm
for (const [name, d] of data) {
  const c = d.rawContent
  const kanrenIdx = c.search(/^## (?:関連パタン|パタンのつながり)/m)
  let kanrenStart = -1, kanrenEnd = -1
  if (kanrenIdx >= 0) {
    kanrenStart = c.indexOf('\n', kanrenIdx) + 1
    const rest = c.slice(kanrenStart)
    const nextSec = rest.search(/^## /m)
    kanrenEnd = nextSec >= 0 ? kanrenStart + nextSec : c.length
  }
  const orphans = []
  for (const m of c.matchAll(bulletLinkRE)) {
    const pos = m.index
    if (kanrenStart >= 0 && pos >= kanrenStart && pos < kanrenEnd) continue
    const link = m[1].trim()
    if (patternNames.has(link)) orphans.push(link)
  }
  if (orphans.length > 0) orphanedLinkPatterns.push({ name, links: orphans })
}

// ⑨ status 管理
const statusDraft    = [...data.entries()].filter(([, d]) => d.status === 'draft').map(([n]) => n).sort((a,b) => a.localeCompare(b,'ja'))
const statusUnknown  = [...data.entries()].filter(([, d]) => !d.status).map(([n]) => n).sort((a,b) => a.localeCompare(b,'ja'))

// ⑦ 孤立パタン（どのパタンからも [[パタン/X]] でリンクされていない）
const inboundCount = new Map()
for (const name of patternNames) inboundCount.set(name, 0)
for (const [, { links }] of data) {
  for (const target of links) {
    if (patternNames.has(target)) inboundCount.set(target, (inboundCount.get(target) ?? 0) + 1)
  }
}
const isolatedPatterns = [...inboundCount.entries()]
  .filter(([, count]) => count === 0)
  .map(([name]) => name)
  .sort((a, b) => a.localeCompare(b, 'ja'))

// ⑩ 疎結合パタン（出次数または入次数が2以下）
// 連番シリーズ（オズボーン①〜⑨など）と「（問い）」修辞パタンシリーズは意図的に疎なので除外
const SERIES_RE = /[①-⑳]|（問い）$/
const outDegree = new Map()
for (const [name, { links }] of data) {
  outDegree.set(name, links.filter(l => patternNames.has(l)).length)
}
const sparsePatterns = [...patternNames]
  .filter(name => !SERIES_RE.test(name))
  .filter(name => (data.get(name)?.type ?? 'pattern') !== 'reference')
  .filter(name => outDegree.get(name) <= 2 || (inboundCount.get(name) ?? 0) <= 2)
  .map(name => ({ name, out: outDegree.get(name), in: inboundCount.get(name) ?? 0 }))
  .sort((a, b) => (a.out + a.in) - (b.out + b.in) || a.name.localeCompare(b.name, 'ja'))

// 差分追跡
const CHECKS = [
  { key: '①非対称',         val: asymmetric.length },
  { key: '②AI欠落',         val: missingActionable.length },
  { key: '③リンク切れ',     val: brokenLinks.length },
  { key: '④タグなし',       val: noPatternTag.length },
  { key: '⑤文献引用ゼロ',   val: uncitedBunken.length },
  { key: '⑥文献逆参照',     val: missingBunkenBacklinks.length },
  { key: '⑦孤立パタン',     val: isolatedPatterns.length },
  { key: '⑧実践概念逆参照', val: missingWikiBacklinks.length },
  { key: '⑨draft',          val: statusDraft.length },
  { key: '⑨未設定',         val: statusUnknown.length },
  { key: '⑩疎結合',         val: sparsePatterns.length },
  { key: '⑪重複リンク',     val: duplicateLinks.length },
  { key: '⑫実践逆参照',     val: missingJissenBacklinks.length },
  { key: '⑬概念逆参照',     val: missingGainenBacklinks.length },
  { key: '⑭充実度',         val: incompleteStructure.length },
  { key: '⑮他Dir逆参照',    val: missingOtherDir.length },
  { key: '⑯古いパタン',     val: stalePatterns.length },
  { key: '⑰出典なし',       val: noSource.length },
  { key: '⑱frontmatter',    val: frontmatterIssues.length },
  { key: '⑲孤立リンク',    val: orphanedLinkPatterns.length },
]

let prevCounts = null
if (existsSync(HISTORY_PATH)) {
  try { prevCounts = JSON.parse(readFileSync(HISTORY_PATH, 'utf8')) } catch {}
}

// レポート生成
const today = new Date().toISOString().slice(0, 10) // ⑯ でも使用
const L = []

L.push('---')
L.push('type: maintenance')
L.push(`updated: ${today}`)
L.push('---')
L.push('')
L.push('# lint-report')
L.push('')
L.push(`最終実行: ${today} — 対象 ${files.length} ファイル`)
L.push('')
L.push('---')
L.push('')

// 前回比
if (prevCounts) {
  const changed = CHECKS.filter(c => prevCounts[c.key] !== undefined && prevCounts[c.key] !== c.val)
  if (changed.length === 0) {
    L.push(`## 前回比（${prevCounts.date}）`)
    L.push('')
    L.push('前回から変化なし。')
  } else {
    L.push(`## 前回比（${prevCounts.date} → ${today}）`)
    L.push('')
    L.push('| チェック | 前回 | 今回 | 増減 |')
    L.push('| --- | --- | --- | --- |')
    for (const c of changed) {
      const diff = c.val - prevCounts[c.key]
      const arrow = diff > 0 ? `↑${diff}` : `↓${Math.abs(diff)}`
      L.push(`| ${c.key} | ${prevCounts[c.key]} | ${c.val} | ${arrow} |`)
    }
  }
  L.push('')
  L.push('---')
  L.push('')
}

// ①
L.push(`## ① 非対称リンク（${asymmetric.length} 件）`)
L.push('')
L.push('A が B を関連パタンに挙げているが、B は A を挙げていないケース。')
L.push('')
if (asymmetric.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| リンク元 | 逆リンクがないリンク先 |')
  L.push('| --- | --- |')
  const shown = asymmetric.slice(0, 150)
  for (const { from, to } of shown) {
    L.push(`| [[パタン/${from}]] | [[パタン/${to}]] |`)
  }
  if (asymmetric.length > 150) L.push(`| *(他 ${asymmetric.length - 150} 件)* | |`)
}
L.push('')

// ②
L.push(`## ② complete だが Actionable Insight なし（${missingActionable.length} 件）`)
L.push('')
if (missingActionable.length === 0) {
  L.push('問題なし。')
} else {
  for (const name of missingActionable) L.push(`- [[パタン/${name}]]`)
}
L.push('')

// ③
L.push(`## ③ リンク切れ（${brokenLinks.length} 件）`)
L.push('')
L.push('関連パタンにリンクはあるが、対応するファイルが存在しない。')
L.push('')
if (brokenLinks.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| リンク元 | 存在しないリンク先 |')
  L.push('| --- | --- |')
  for (const { from, to } of brokenLinks) {
    L.push(`| [[パタン/${from}]] | ${to} |`)
  }
}
L.push('')

// ④
L.push(`## ④ パタンタグなし（${noPatternTag.length} 件）`)
L.push('')
if (noPatternTag.length === 0) {
  L.push('問題なし。')
} else {
  for (const name of noPatternTag) L.push(`- [[パタン/${name}]]`)
}
L.push('')

// ⑤
L.push(`## ⑤ 引用ゼロの文献ページ（${uncitedBunken.length} 件）`)
L.push('')
L.push('どのパタンからも [[文献/X]] で引用されていない文献ページ。')
L.push('')
if (uncitedBunken.length === 0) {
  L.push('問題なし。')
} else {
  for (const bname of uncitedBunken.sort()) L.push(`- [[文献/${bname}]]`)
}
L.push('')

// ⑥
L.push(`## ⑥ 文献→パタン逆参照の欠落（${missingBunkenBacklinks.length} 件）`)
L.push('')
L.push('パタンが [[文献/X]] を引用しているが、文献ページに [[パタン/Y]] の逆リンクがないケース。')
L.push('')
if (missingBunkenBacklinks.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| 文献ページ | 逆参照が欠落しているパタン |')
  L.push('| --- | --- |')
  const sorted = missingBunkenBacklinks.sort((a, b) => a.bunken.localeCompare(b.bunken, 'ja'))
  const shown = sorted.slice(0, 100)
  for (const { pattern, bunken } of shown) {
    L.push(`| [[文献/${bunken}]] | [[パタン/${pattern}]] |`)
  }
  if (missingBunkenBacklinks.length > 100) L.push(`| *(他 ${missingBunkenBacklinks.length - 100} 件)* | |`)
}
L.push('')

// ⑧
L.push(`## ⑧ 実践・概念→文献逆参照の欠落（${missingWikiBacklinks.length} 件）`)
L.push('')
L.push('実践・概念ページが [[文献/X]] を引用しているが、文献ページに逆リンクがないケース。')
L.push('')
if (missingWikiBacklinks.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| 文献ページ | 逆参照が欠落しているページ |')
  L.push('| --- | --- |')
  for (const { page, bunken } of missingWikiBacklinks.sort((a, b) => a.bunken.localeCompare(b.bunken, 'ja'))) {
    L.push(`| [[文献/${bunken}]] | [[${page}]] |`)
  }
}
L.push('')

// ⑦ レポート
L.push(`## ⑦ 孤立パタン（${isolatedPatterns.length} 件）`)
L.push('')
L.push('どのパタンからも [[パタン/X]] でリンクされていない（入次数=0）ページ。')
L.push('')
if (isolatedPatterns.length === 0) {
  L.push('問題なし。')
} else {
  for (const name of isolatedPatterns) L.push(`- [[パタン/${name}]]`)
}
L.push('')

// ⑬
L.push(`## ⑬ パタン→概念逆参照の欠落（${missingGainenBacklinks.length} 件）`)
L.push('')
L.push('パタンが [[概念/X]] にリンクしているが、概念ページに [[パタン/Y]] の逆リンクがないケース。')
L.push('')
if (missingGainenBacklinks.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| 概念ページ | 逆参照が欠落しているパタン |')
  L.push('| --- | --- |')
  const shown = missingGainenBacklinks.sort((a,b) => a.gainen.localeCompare(b.gainen,'ja')).slice(0,100)
  for (const { pattern, gainen } of shown) {
    L.push(`| [[概念/${gainen}]] | [[パタン/${pattern}]] |`)
  }
  if (missingGainenBacklinks.length > 100) L.push(`| *(他 ${missingGainenBacklinks.length - 100} 件)* | |`)
}
L.push('')

// ⑭
L.push(`## ⑭ パタン充実度（status:complete で必須セクション欠落）（${incompleteStructure.length} 件）`)
L.push('')
L.push('status:complete なのに「背景」「問題」「解決」のいずれかが欠けているパタン。')
L.push('')
if (incompleteStructure.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| パタン | 欠落セクション |')
  L.push('| --- | --- |')
  for (const { name, missing } of incompleteStructure.sort((a,b) => a.name.localeCompare(b.name,'ja'))) {
    L.push(`| [[パタン/${name}]] | ${missing.join('・')} |`)
  }
}
L.push('')

// ⑮
L.push(`## ⑮ 学級経営・特別支援→パタン／文献 逆参照の欠落（${missingOtherDir.length} 件）`)
L.push('')
L.push('学級経営・特別支援ページがリンクしているが、リンク先に逆参照がないケース。')
L.push('')
if (missingOtherDir.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| ページ | リンク先 | 種別 |')
  L.push('| --- | --- | --- |')
  for (const { dir, page, target, kind } of missingOtherDir.sort((a,b) => a.page.localeCompare(b.page,'ja'))) {
    const pageLink = `[[${dir}/${page}]]`
    const targetLink = kind === 'パタン' ? `[[パタン/${target}]]` : `[[文献/${target}]]`
    L.push(`| ${pageLink} | ${targetLink} | ${kind} |`)
  }
}
L.push('')

// ⑯
L.push(`## ⑯ 更新が古いパタン（status:complete で1年以上未更新）（${stalePatterns.length} 件）`)
L.push('')
L.push('改稿・補強の候補。updated が最も古いものから順に表示。')
L.push('')
if (stalePatterns.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| パタン | 最終更新 |')
  L.push('| --- | --- |')
  const shown = stalePatterns.slice(0, 60)
  for (const { name, updated } of shown) {
    L.push(`| [[パタン/${name}]] | ${updated} |`)
  }
  if (stalePatterns.length > 60) L.push(`| *(他 ${stalePatterns.length - 60} 件)* | |`)
}
L.push('')

// ⑰
L.push(`## ⑰ 出典セクションなし（status:complete）（${noSource.length} 件）`)
L.push('')
L.push('status:complete なのに ## 出典 セクションがないパタン。引用根拠が不明。')
L.push('')
if (noSource.length === 0) {
  L.push('問題なし。')
} else {
  for (const name of noSource) L.push(`- [[パタン/${name}]]`)
}
L.push('')

// ⑱
L.push(`## ⑱ frontmatter 標準化（${frontmatterIssues.length} 件）`)
L.push('')
L.push('`date:` 形式（YYYY-MM-DD）・`tags:` 配列形式・`status:` 値の整合性チェック。')
L.push('')
if (frontmatterIssues.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| パタン | 問題 |')
  L.push('| --- | --- |')
  for (const { name, issues } of frontmatterIssues.sort((a,b) => a.name.localeCompare(b.name,'ja'))) {
    L.push(`| [[パタン/${name}]] | ${issues.join(' / ')} |`)
  }
}
L.push('')

// ⑪
L.push(`## ⑪ 関連パタンの重複リンク（${duplicateLinks.length} 件）`)
L.push('')
L.push('同一の 関連パタン セクションに同じ [[パタン/X]] が2回以上出現しているケース。')
L.push('')
if (duplicateLinks.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| パタン | 重複しているリンク |')
  L.push('| --- | --- |')
  for (const { from, dup } of duplicateLinks.sort((a,b) => a.from.localeCompare(b.from,'ja'))) {
    L.push(`| [[パタン/${from}]] | [[パタン/${dup}]] |`)
  }
}
L.push('')

// ⑫
L.push(`## ⑫ 実践→パタン逆参照の欠落（${missingJissenBacklinks.length} 件）`)
L.push('')
L.push('実践ページが [[パタン/X]] にリンクしているが、パタンXに [[実践/Y]] の逆リンクがないケース。')
L.push('')
if (missingJissenBacklinks.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| パタン | 逆リンクが欠落している実践ページ |')
  L.push('| --- | --- |')
  const shown = missingJissenBacklinks.sort((a,b) => a.pattern.localeCompare(b.pattern,'ja')).slice(0, 100)
  for (const { pattern, jissen } of shown) {
    L.push(`| [[パタン/${pattern}]] | [[実践/${jissen}]] |`)
  }
  if (missingJissenBacklinks.length > 100) L.push(`| *(他 ${missingJissenBacklinks.length - 100} 件)* | |`)
}
L.push('')

// ⑨
L.push(`## ⑨ status 管理（draft: ${statusDraft.length} 件 / 未設定: ${statusUnknown.length} 件）`)
L.push('')
if (statusDraft.length > 0) {
  L.push(`### status:draft（${statusDraft.length} 件）`)
  L.push('')
  for (const name of statusDraft) L.push(`- [[パタン/${name}]]`)
  L.push('')
}
if (statusUnknown.length > 0) {
  L.push(`### status 未設定（${statusUnknown.length} 件）`)
  L.push('')
  for (const name of statusUnknown) L.push(`- [[パタン/${name}]]`)
  L.push('')
}
if (statusDraft.length === 0 && statusUnknown.length === 0) {
  L.push('問題なし。')
  L.push('')
}

// ⑩
L.push(`## ⑩ 疎結合パタン（出次数≤2 または 入次数≤2）（${sparsePatterns.length} 件）`)
L.push('')
L.push('関連パタンのリンクが少なく、ネットワークへの接続が薄いパタン。')
L.push('')
if (sparsePatterns.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| パタン | 出次数 | 入次数 |')
  L.push('| --- | --- | --- |')
  const shown = sparsePatterns.slice(0, 80)
  for (const { name, out, in: inc } of shown) {
    L.push(`| [[パタン/${name}]] | ${out} | ${inc} |`)
  }
  if (sparsePatterns.length > 80) L.push(`| *(他 ${sparsePatterns.length - 80} 件)* | | |`)
}
L.push('')

// ⑲
L.push(`## ⑲ 孤立パタンリンク（関連パタン外のbullet [[パタン/X]]）（${orphanedLinkPatterns.length} 件）`)
L.push('')
L.push('`## 関連パタン` セクション外に置かれた `- [[パタン/X]]` 形式のリンク。lint の⑩や fix-hub-backlinks から見えず、ネットワーク統計に反映されない。')
L.push('')
if (orphanedLinkPatterns.length === 0) {
  L.push('問題なし。')
} else {
  L.push('| パタン | 孤立リンク |')
  L.push('| --- | --- |')
  for (const { name, links } of orphanedLinkPatterns.sort((a,b) => a.name.localeCompare(b.name,'ja'))) {
    L.push(`| [[パタン/${name}]] | ${links.map(l => `[[パタン/${l}]]`).join(', ')} |`)
  }
}
L.push('')

// パタン成熟度
const total = data.size
const cntComplete   = [...data.values()].filter(d => d.status === 'complete').length
const cntDeveloping = [...data.values()].filter(d => d.status === 'developing').length
const cntStub       = [...data.values()].filter(d => d.status === 'stub').length
const cntOther      = total - cntComplete - cntDeveloping - cntStub
const pct = n => `${Math.round(n / total * 100)}%`
L.push(`## パタン成熟度（全 ${total} パタン）`)
L.push('')
L.push('| status | 件数 | 割合 |')
L.push('| --- | ---: | ---: |')
L.push(`| complete   | ${cntComplete}   | ${pct(cntComplete)}   |`)
L.push(`| developing | ${cntDeveloping} | ${pct(cntDeveloping)} |`)
L.push(`| stub       | ${cntStub}       | ${pct(cntStub)}       |`)
if (cntOther > 0) L.push(`| その他     | ${cntOther}       | ${pct(cntOther)}       |`)
L.push('')

// 内容が変わらない限りvaultに書き込まない（launchd WatchPathsの再トリガー防止）
const reportContent = L.join('\n')
if (!existsSync(REPORT) || readFileSync(REPORT, 'utf8') !== reportContent) {
  writeFileSync(REPORT, reportContent, 'utf8')
}

const historyData = { date: today, ...Object.fromEntries(CHECKS.map(c => [c.key, c.val])) }
writeFileSync(HISTORY_PATH, JSON.stringify(historyData, null, 2), 'utf8')

console.log(`Lint: ①非対称=${asymmetric.length} ②AI欠落=${missingActionable.length} ③リンク切れ=${brokenLinks.length} ④タグなし=${noPatternTag.length} ⑤文献引用ゼロ=${uncitedBunken.length} ⑥文献逆参照欠落=${missingBunkenBacklinks.length} ⑦孤立パタン=${isolatedPatterns.length} ⑧実践概念逆参照欠落=${missingWikiBacklinks.length} ⑨draft=${statusDraft.length}/未設定=${statusUnknown.length} ⑩疎結合=${sparsePatterns.length} ⑪重複リンク=${duplicateLinks.length} ⑫実践逆参照欠落=${missingJissenBacklinks.length} ⑬概念逆参照欠落=${missingGainenBacklinks.length} ⑭充実度=${incompleteStructure.length} ⑮他Dir逆参照欠落=${missingOtherDir.length} ⑯古いパタン=${stalePatterns.length} ⑰出典なし=${noSource.length} ⑱frontmatter=${frontmatterIssues.length} ⑲孤立リンク=${orphanedLinkPatterns.length}`)
