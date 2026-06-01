/**
 * sync-connection-board.mjs
 * つながり反映ログから、作業ボードの完了一覧だけを更新する。
 * 今日読む候補や判断メモは手作業欄として残す。
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

const ROOT = '/Users/iwaiteruhisa/quartz/content'
const VAULT_ROOT =
  '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki'
const BOARD = join(ROOT, 'メンテナンス', '次に反映するつながり.md')
const LOG = join(ROOT, 'メンテナンス', 'つながり反映ログ.md')
const VAULT_BOARD = join(VAULT_ROOT, 'メンテナンス', '次に反映するつながり.md')

function todayTokyo() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function parseLogRows() {
  return readFileSync(LOG, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| ') && !line.includes('---') && !line.includes('日付 | 候補'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 6)
    .filter(([, pair]) => pair.includes('[[パタン/'))
    .map(([date, pair, target]) => ({ date, pair, target }))
}

function renderCompletedSection(rows) {
  const lines = [
    '## 完了した候補',
    '',
    '完了した候補は [[メンテナンス/つながり反映ログ]] から更新する。',
    '',
    '<!-- completed-from-log:start -->',
    '| 完了日 | 候補 | 反映先 |',
    '|---|---|---|',
  ]
  if (rows.length === 0) {
    lines.push('|  |  |  |')
  } else {
    for (const row of rows) {
      lines.push(`| ${row.date} | ${row.pair} | ${row.target} |`)
    }
  }
  lines.push('<!-- completed-from-log:end -->', '')
  return lines.join('\n')
}

function updateFrontmatterDate(content) {
  return content.replace(/^updated:\s*.+$/m, `updated: ${todayTokyo()}`)
}

const rows = parseLogRows()
const board = updateFrontmatterDate(readFileSync(BOARD, 'utf8'))
const completed = renderCompletedSection(rows)
const updated = board.replace(/## 完了した候補[\s\S]*?(?=## 作業手順)/, `${completed}\n`)

mkdirSync(dirname(BOARD), { recursive: true })
writeFileSync(BOARD, updated, 'utf8')
mkdirSync(dirname(VAULT_BOARD), { recursive: true })
writeFileSync(VAULT_BOARD, updated, 'utf8')

console.log(`sync-connection-board: updated ${BOARD} from ${rows.length} log row(s)`)
