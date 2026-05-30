/**
 * fix-orphaned-links.mjs
 * 関連パタンセクション外に置かれた `- [[パタン/X]]` 形式のリンクを修正する。
 *  - 関連パタンセクションに未掲載 → 末尾に移動（説明付きで）
 *  - 関連パタンセクションに既掲載 → 孤立行を削除のみ
 * sync-obsidian.sh の run-all-fixes.sh から呼び出される。
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const VAULT = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'
const BULLET_LINK_RE = /^- \[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\](?:\s+[—–\-].*)?$/

function fixFile(content) {
  const lines = content.split('\n')

  // 関連パタンセクションの行範囲を特定
  let kanrenStart = -1, kanrenEnd = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^## (?:関連パタン|パタンのつながり)/.test(lines[i])) {
      kanrenStart = i + 1
    } else if (kanrenStart >= 0 && kanrenEnd < 0 && /^## /.test(lines[i])) {
      kanrenEnd = i
      break
    }
  }
  // 関連パタンセクションがない場合: 孤立リンクを集めて新規セクションを作成
  if (kanrenStart < 0) {
    const orphans2 = []
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(BULLET_LINK_RE)
      if (!m) continue
      const patternName = lines[i].match(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/)[1].trim()
      orphans2.push({ lineIdx: i, fullLine: lines[i], patternName })
    }
    if (orphans2.length === 0) return content
    // 挿入位置: ## クラスター図 or ## Actionable Insight の直前
    const insertIdx = lines.findIndex(l => /^## (?:クラスター図|Actionable Insight)/.test(l))
    if (insertIdx < 0) return content
    const removeSet2 = new Set(orphans2.map(o => o.lineIdx))
    const filtered = lines.filter((_, i) => !removeSet2.has(i))
    // 圧縮後の挿入位置を再探索
    const newInsert = filtered.findIndex(l => /^## (?:クラスター図|Actionable Insight)/.test(l))
    if (newInsert < 0) return filtered.join('\n')
    const section = ['', '## 関連パタン', '', ...orphans2.map(o => o.fullLine), '']
    filtered.splice(newInsert, 0, ...section)
    return filtered.join('\n')
  }
  if (kanrenEnd < 0) kanrenEnd = lines.length

  // 関連パタンセクション内の既存リンクを収集
  const inKanren = new Set()
  for (let i = kanrenStart; i < kanrenEnd; i++) {
    const m = lines[i].match(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/)
    if (m) inKanren.add(m[1].trim())
  }

  // セクション外の孤立リンクを収集
  const orphans = []
  for (let i = 0; i < lines.length; i++) {
    if (i >= kanrenStart && i < kanrenEnd) continue
    const m = lines[i].match(BULLET_LINK_RE)
    if (!m) continue
    const patternName = lines[i].match(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/)[1].trim()
    orphans.push({ lineIdx: i, fullLine: lines[i], patternName })
  }

  if (orphans.length === 0) return content

  // 孤立行を削除対象に登録
  const removeSet = new Set(orphans.map(o => o.lineIdx))

  // 関連パタンに未掲載のものは移動リストへ
  const toMove = orphans.filter(o => !inKanren.has(o.patternName))

  // 孤立行を除いた行配列を構築（前後の連続空行も1行に圧縮）
  const filteredLines = []
  let prevBlank = false
  for (let i = 0; i < lines.length; i++) {
    if (removeSet.has(i)) continue
    const isBlank = lines[i].trim() === ''
    if (isBlank && prevBlank) continue  // 連続空行を圧縮
    filteredLines.push(lines[i])
    prevBlank = isBlank
  }

  // 再度 関連パタンセクション末尾を特定して移動リストを挿入
  let newKanrenStart = -1, newKanrenEnd = -1
  for (let i = 0; i < filteredLines.length; i++) {
    if (/^## (?:関連パタン|パタンのつながり)/.test(filteredLines[i])) {
      newKanrenStart = i + 1
    } else if (newKanrenStart >= 0 && newKanrenEnd < 0 && /^## /.test(filteredLines[i])) {
      newKanrenEnd = i
      break
    }
  }
  if (newKanrenStart < 0) return filteredLines.join('\n')
  if (newKanrenEnd < 0) newKanrenEnd = filteredLines.length

  if (toMove.length > 0) {
    filteredLines.splice(newKanrenEnd, 0, ...toMove.map(o => o.fullLine))
  }

  return filteredLines.join('\n')
}

let fixedFiles = 0
let movedCount = 0
let removedCount = 0

for (const fname of readdirSync(VAULT).sort()) {
  if (!fname.endsWith('.md')) continue

  const fpath = join(VAULT, fname)
  const original = readFileSync(fpath, 'utf8')

  // 統計用に孤立リンク数を数える
  const lines = original.split('\n')
  let kanrenStart = -1, kanrenEnd = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^## (?:関連パタン|パタンのつながり)/.test(lines[i])) kanrenStart = i + 1
    else if (kanrenStart >= 0 && kanrenEnd < 0 && /^## /.test(lines[i])) { kanrenEnd = i; break }
  }
  if (kanrenStart < 0) { const fixed2 = fixFile(original); if (fixed2 !== original) { writeFileSync(fpath, fixed2, 'utf8'); fixedFiles++ }; continue }
  if (kanrenEnd < 0) kanrenEnd = lines.length
  const inKanren = new Set()
  for (let i = kanrenStart; i < kanrenEnd; i++) {
    const m = lines[i].match(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/)
    if (m) inKanren.add(m[1].trim())
  }
  let fileMoved = 0, fileRemoved = 0
  for (let i = 0; i < lines.length; i++) {
    if (i >= kanrenStart && i < kanrenEnd) continue
    const m = lines[i].match(BULLET_LINK_RE)
    if (!m) continue
    const name = lines[i].match(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/)[1].trim()
    if (inKanren.has(name)) fileRemoved++
    else fileMoved++
  }

  const fixed = fixFile(original)
  if (fixed !== original) {
    writeFileSync(fpath, fixed, 'utf8')
    fixedFiles++
    movedCount += fileMoved
    removedCount += fileRemoved
    console.log(`  ${fname}: moved=${fileMoved} removed=${fileRemoved}`)
  }
}

console.log(`fix-orphaned-links: ${fixedFiles} files fixed (moved=${movedCount}, removed=${removedCount})`)
