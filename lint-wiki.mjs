/**
 * lint-wiki.mjs
 * パタンファイルの品質チェックを行い wiki/メンテナンス/lint-report.md に書き出す。
 *
 * チェック項目:
 *   ① 非対称リンク（A→B だが B→A がない）
 *   ② status:complete なのに Actionable Insight がない
 *   ③ 関連パタンのリンク切れ（リンク先ファイルが存在しない）
 *   ④ frontmatter の tags に「パタン」が含まれない
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const VAULT   = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'
const REPORT  = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/メンテナンス/lint-report.md'

// 全パタンファイル一覧
const files = readdirSync(VAULT).filter(f => f.endsWith('.md')).sort()
const patternNames = new Set(files.map(f => f.replace(/\.md$/, '')))

// 各ファイルを解析
const data = new Map() // name → { links, status, hasActionable, hasPatternTag }

for (const fname of files) {
  const name = fname.replace(/\.md$/, '')
  const content = readFileSync(join(VAULT, fname), 'utf8')

  // 関連パタンセクションのリンクを抽出
  const relM = content.match(/^#{2,3}\s*関連パタン([\s\S]*?)(?=^#{1,3} |\Z)/m)
  const links = relM
    ? [...relM[1].matchAll(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim())
    : []

  const statusM  = content.match(/^status:\s*(\S+)/m)
  const tagsM    = content.match(/^tags:\s*\[([^\]]+)\]/m)

  data.set(name, {
    links: [...new Set(links)],
    status: statusM ? statusM[1] : null,
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

// レポート生成
const today = new Date().toISOString().slice(0, 10)
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

writeFileSync(REPORT, L.join('\n'), 'utf8')

console.log(`Lint: ①非対称=${asymmetric.length} ②AI欠落=${missingActionable.length} ③リンク切れ=${brokenLinks.length} ④タグなし=${noPatternTag.length}`)
