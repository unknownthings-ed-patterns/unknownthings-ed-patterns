/**
 * network-report.mjs
 * パタンネットワークの中心性分析レポートを生成する。
 * wiki/メンテナンス/network-report.md に書き出す。
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

const VAULT  = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'
const REPORT = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/メンテナンス/network-report.md'

const files = readdirSync(VAULT).filter(f => f.endsWith('.md') && f !== 'index.md').sort()
const patternNames = new Set(files.map(f => f.replace(/\.md$/, '')))

// 全文中の [[パタン/X]] 参照を集計（関連パタンセクション外の本文参照も含む）
const outLinks = new Map()
const inLinks  = new Map()
for (const name of patternNames) {
  outLinks.set(name, new Set())
  inLinks.set(name, new Set())
}

for (const fname of files) {
  const name    = fname.replace(/\.md$/, '')
  const content = readFileSync(join(VAULT, fname), 'utf8')
  const targets = [...new Set(
    [...content.matchAll(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim())
  )].filter(t => patternNames.has(t) && t !== name)

  for (const t of targets) {
    outLinks.get(name).add(t)
    inLinks.get(t).add(name)
  }
}

const stats = [...patternNames].map(name => ({
  name,
  out: outLinks.get(name).size,
  in:  inLinks.get(name).size,
  hub: outLinks.get(name).size * inLinks.get(name).size,
}))

const today = new Date().toISOString().slice(0, 10)
const L = []

L.push('---')
L.push('type: maintenance')
L.push(`updated: ${today}`)
L.push('---')
L.push('')
L.push('# network-report')
L.push('')
L.push(`最終実行: ${today} — 対象 ${files.length} パタン`)
L.push('')
L.push('---')
L.push('')

// 被参照数ランキング
const byIn = [...stats].sort((a, b) => b.in - a.in || a.name.localeCompare(b.name, 'ja'))
L.push('## 被参照数ランキング TOP20（入次数）')
L.push('')
L.push('最も多くのパタンから参照されているパタン。Wiki全体の核心概念・ハブ。')
L.push('')
L.push('| 順位 | パタン | 被参照数 | 参照数 |')
L.push('| --- | --- | --- | --- |')
for (const [i, { name, in: inc, out }] of byIn.slice(0, 20).entries()) {
  L.push(`| ${i + 1} | [[パタン/${name}]] | ${inc} | ${out} |`)
}
L.push('')

// 参照数ランキング
const byOut = [...stats].sort((a, b) => b.out - a.out || a.name.localeCompare(b.name, 'ja'))
L.push('## 参照数ランキング TOP20（出次数）')
L.push('')
L.push('最も多くのパタンを参照しているパタン。他の概念との統合・接続点。')
L.push('')
L.push('| 順位 | パタン | 参照数 | 被参照数 |')
L.push('| --- | --- | --- | --- |')
for (const [i, { name, out, in: inc }] of byOut.slice(0, 20).entries()) {
  L.push(`| ${i + 1} | [[パタン/${name}]] | ${out} | ${inc} |`)
}
L.push('')

// ハブスコアランキング
const byHub = [...stats].sort((a, b) => b.hub - a.hub || a.name.localeCompare(b.name, 'ja'))
L.push('## ハブスコア TOP20（出次数 × 入次数）')
L.push('')
L.push('出次数と入次数の積。ネットワークの橋渡し役として最も中心的なパタン。')
L.push('')
L.push('| 順位 | パタン | スコア | 出 | 入 |')
L.push('| --- | --- | --- | --- | --- |')
for (const [i, { name, hub, out, in: inc }] of byHub.slice(0, 20).entries()) {
  L.push(`| ${i + 1} | [[パタン/${name}]] | ${hub} | ${out} | ${inc} |`)
}
L.push('')

// ネットワーク全体統計
const totalLinks = stats.reduce((s, d) => s + d.out, 0)
const avgDeg     = (totalLinks / stats.length).toFixed(1)
const maxIn      = Math.max(...stats.map(s => s.in))
const maxOut     = Math.max(...stats.map(s => s.out))
const density    = (totalLinks / (stats.length * (stats.length - 1)) * 100).toFixed(2)

L.push('## ネットワーク全体統計')
L.push('')
L.push('| 指標 | 値 |')
L.push('| --- | --- |')
L.push(`| パタン総数 | ${files.length} |`)
L.push(`| リンク総数 | ${totalLinks} |`)
L.push(`| 平均次数 | ${avgDeg} |`)
L.push(`| 最大被参照数 | ${maxIn}（${byIn[0]?.name}）|`)
L.push(`| 最大参照数 | ${maxOut}（${byOut[0]?.name}）|`)
L.push(`| ネットワーク密度 | ${density}% |`)
L.push('')

// 内容が変わらない限りvaultに書き込まない（launchd WatchPathsの再トリガー防止）
const reportContent = L.join('\n')
if (!existsSync(REPORT) || readFileSync(REPORT, 'utf8') !== reportContent) {
  writeFileSync(REPORT, reportContent, 'utf8')
}
console.log(`network-report: ${files.length} パタン / ${totalLinks} リンク / TOP被参照: ${byIn[0]?.name}(${byIn[0]?.in}) / 密度: ${density}%`)
