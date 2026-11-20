/**
 * generate-source-check.mjs
 * 文献ページの frontmatter `source_check`（本 Wiki が原典をどこまで確かめたか）を読み、
 * その文献を引くページの末尾近く（## 出典 の直後）に「## 根拠の確かめ（自動生成）」を作る。
 * 知識を共有の資源として保つ条件「根拠に戻れること」（概念/教育実践知のコモンズ（構想））を、
 * 読む人に見える形にするためのもの。
 * 既存の節は毎回まるごと作り直す。文献リンクがなくなったページからは節を外す。
 * sync-obsidian.sh から呼び出される。--dry-run で書き換えずに件数だけ出す。
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

const WIKI = process.env.WIKI_DIR || '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki'
const DIRS = ['パタン', 'メタパタン', '概念', '実践', '教材', '教科', '特別支援', '学級経営']
const DRY_RUN = process.argv.includes('--dry-run')

export const SOURCE_CHECK_LEVELS = [
  ['原典照合', '原典にあたって、引用や要約を照らした'],
  ['一部照合', '原典の一部の章や頁だけを読んで確かめた'],
  ['要旨のみ', '要旨や紹介だけを読んだ'],
  ['孫引き', 'ほかの文献を通して知った。原典は未読'],
  ['記録なし', '何をどこまで読んだかの記録がまだない'],
  ['その他', '動画の記録や本 Wiki の作者自身の本など'],
]
const LEVEL_NAMES = SOURCE_CHECK_LEVELS.map(([k]) => k)

const HEADING = '## 根拠の確かめ（自動生成）'
const MARKER = '<!-- source-check: 自動生成。手で編集しない。文献ページの frontmatter の source_check から作る -->'

// 文献ページの source_check を集める
const bunkenDir = join(WIKI, '文献')
const levelOf = new Map()
const missing = []
for (const f of readdirSync(bunkenDir).filter(f => f.endsWith('.md') && f !== 'index.md')) {
  const name = f.replace(/\.md$/, '')
  const text = readFileSync(join(bunkenDir, f), 'utf8')
  const fm = text.match(/^---\n([\s\S]*?)\n---/)
  const m = fm && fm[1].match(/^source_check:\s*"?([^"\n]+?)"?\s*$/m)
  if (m && LEVEL_NAMES.includes(m[1].trim())) levelOf.set(name, m[1].trim())
  else missing.push(name)
}

function shortName(name) {
  const m = name.match(/（([^（）]+)）$/)
  return m ? m[1] : name
}

function removeSection(content) {
  const start = content.indexOf(HEADING)
  if (start === -1) return content
  const rest = content.slice(start + HEADING.length)
  const next = rest.search(/^## /m)
  const before = content.slice(0, start).trimEnd()
  if (next === -1) return before + '\n'
  return before + '\n\n' + content.slice(start + HEADING.length + next)
}

function buildSection(links) {
  const groups = new Map(LEVEL_NAMES.map(k => [k, []]))
  for (const l of links) groups.get(levelOf.get(l) ?? '記録なし').push(l)
  const lines = [
    HEADING,
    '',
    MARKER,
    'このページが引く文献を、本 Wiki が原典でどこまで確かめたかで分けた。くわしくは各文献ページの「書誌・確認した範囲」や「原文との照合」へ。',
    '',
  ]
  for (const [k, desc] of SOURCE_CHECK_LEVELS) {
    const g = groups.get(k)
    if (g.length === 0) continue
    lines.push(`- **${k}**（${desc}）：` + g.map(l => `[[文献/${l}|${shortName(l)}]]`).join('・'))
  }
  return lines.join('\n') + '\n'
}

function insertSection(content, section) {
  const src = content.match(/^## 出典.*$/m)
  if (src) {
    const after = src.index + src[0].length
    const next = content.slice(after).search(/^## /m)
    if (next !== -1) {
      const pos = after + next
      return content.slice(0, pos).trimEnd() + '\n\n' + section + '\n' + content.slice(pos)
    }
  }
  return content.trimEnd() + '\n\n' + section
}

let changed = 0, withSection = 0
for (const dir of DIRS) {
  const d = join(WIKI, dir)
  if (!existsSync(d)) continue
  for (const f of readdirSync(d).filter(f => f.endsWith('.md'))) {
    const p = join(d, f)
    const orig = readFileSync(p, 'utf8')
    const base = removeSection(orig)
    const links = [...new Set(
      [...base.matchAll(/\[\[文献\/([^\]|#]+?)(?:[|#][^\]]*)?\]\]/g)].map(m => m[1].trim())
    )].filter(l => levelOf.has(l) || missing.includes(l))
    const next = links.length ? insertSection(base, buildSection(links)) : base
    if (links.length) withSection++
    // 節を足しも外しもしないページは、末尾の改行も含めて元のままにする
    if (next === orig || (!links.length && !orig.includes(HEADING))) continue
    changed++
    if (!DRY_RUN) writeFileSync(p, next)
  }
}

console.log(`${DRY_RUN ? '[dry-run] ' : ''}根拠の確かめ: 節のあるページ ${withSection}・書き換え ${changed}・source_check 未設定の文献 ${missing.length}`)
