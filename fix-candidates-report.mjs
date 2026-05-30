/**
 * fix-candidates-report.mjs
 * run-all-fixes.sh の dry-run 結果を Obsidian のメンテナンスページに書き出す。
 */

import { writeFileSync } from 'fs'
import { spawnSync } from 'child_process'

const REPORT = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/メンテナンス/fix-candidates.md'

const result = spawnSync('./run-all-fixes.sh', [], {
  cwd: '/Users/iwaiteruhisa/quartz',
  encoding: 'utf8',
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
if (result.status !== 0) {
  console.error(output)
  process.exit(result.status ?? 1)
}

const today = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())
const lines = output.split(/\r?\n/)

const sections = []
let current = null

for (const line of lines) {
  const sectionMatch = line.match(/^=== \[(\d+)\/(\d+)\] (.+?) ===$/)
  if (sectionMatch) {
    current = {
      title: sectionMatch[3],
      summary: [],
      items: [],
    }
    sections.push(current)
    continue
  }

  if (!current) continue

  if (line.includes('[dry-run] ✓')) {
    const item = line.replace(/^\s*\[dry-run\]\s*✓\s*/, '').trim()
    current.items.push(item)
    continue
  }

  if (line.includes('[dry-run] 完了') || line.startsWith('修正対象:') || line.startsWith('パタン側:')) {
    current.summary.push(line.replace('[dry-run] ', '').trim())
  }
}

const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0)
const L = []

function wikiLink(kind, name) {
  return `[[${kind}/${name}]]`
}

function formatItem(sectionTitle, item) {
  const countMatch = item.match(/^(.*?)(?::|\s)\s*(\+\d+ 件|\(\+\d+\))$/)
  const name = countMatch ? countMatch[1].trim() : item.trim()
  const suffix = countMatch ? ` ${countMatch[2]}` : ''

  if (sectionTitle.includes('文献→Wiki逆参照')) return `${wikiLink('文献', name)}${suffix}`
  if (name.startsWith('パタン/')) return `${wikiLink('パタン', name.slice('パタン/'.length))}${suffix}`
  if (name.startsWith('文献/')) return `${wikiLink('文献', name.slice('文献/'.length))}${suffix}`
  if (name.startsWith('概念/')) return `${wikiLink('概念', name.slice('概念/'.length))}${suffix}`
  if (name.startsWith('実践/')) return `${wikiLink('実践', name.slice('実践/'.length))}${suffix}`
  if (sectionTitle.includes('パタン')) return `${wikiLink('パタン', name)}${suffix}`
  return item
}

L.push('---')
L.push('type: maintenance')
L.push(`updated: ${today}`)
L.push('---')
L.push('')
L.push('# 自動修正候補レポート')
L.push('')
L.push(`最終実行: ${today}`)
L.push('')
L.push('このページは `run-all-fixes.sh` の dry-run 結果です。ここに表示されている段階では、Obsidian の本文はまだ書き換えられていません。')
L.push('')
L.push(`候補グループ: ${sections.length} / 表示候補: ${totalItems}`)
L.push('')
L.push('---')
L.push('')

for (const section of sections) {
  L.push(`## ${section.title}`)
  L.push('')

  if (section.summary.length > 0) {
    for (const summary of section.summary) L.push(`- ${summary}`)
    L.push('')
  }

  if (section.items.length === 0) {
    L.push('候補なし。')
  } else {
    for (const item of section.items) L.push(`- ${formatItem(section.title, item)}`)
  }
  L.push('')
}

L.push('---')
L.push('')
L.push('## 実行方法')
L.push('')
L.push('確認だけ:')
L.push('')
L.push('```bash')
L.push('./run-all-fixes.sh')
L.push('```')
L.push('')
L.push('本文を書き換える:')
L.push('')
L.push('```bash')
L.push('./run-all-fixes.sh --apply')
L.push('```')
L.push('')

writeFileSync(REPORT, `${L.join('\n')}\n`, 'utf8')
console.log(`fix-candidates-report: wrote ${REPORT}`)
