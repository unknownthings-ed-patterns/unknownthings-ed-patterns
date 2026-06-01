/**
 * suggest-wiki-growth.mjs
 * Wiki全体から、新しい関連候補・近いパタン候補・新規パタン候補を提案する。
 * 本文は変更せず、メンテナンスレポートだけを書き出す。
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, join } from 'path'

const ROOT = '/Users/iwaiteruhisa/quartz/content'
const VAULT_REPORT =
  '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/メンテナンス/新しいつながりとパタン候補.md'
const CONTENT_REPORT = join(ROOT, 'メンテナンス', '新しいつながりとパタン候補.md')

const DIRS = {
  patterns: join(ROOT, 'パタン'),
  literature: join(ROOT, '文献'),
  practices: join(ROOT, '実践'),
  concepts: join(ROOT, '概念'),
  maintenance: join(ROOT, 'メンテナンス'),
}

function todayTokyo() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function markdownFiles(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md') && name !== 'index.md')
    .sort((a, b) => a.localeCompare(b, 'ja'))
}

function pageName(file) {
  return basename(file, '.md')
}

function wikiLinks(content, prefix) {
  return [
    ...content.matchAll(
      new RegExp(String.raw`\[\[${prefix}/([^\]|#]+?)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]`, 'g'),
    ),
  ].map((match) => match[1].trim())
}

function unique(list) {
  return [...new Set(list)].sort((a, b) => a.localeCompare(b, 'ja'))
}

function extractRelatedPatternLinks(content) {
  const sectionIdx = content.search(/^#{2,3}\s*(?:関連パタン|パタンのつながり)/m)
  if (sectionIdx < 0) return []
  const afterHeader = content.indexOf('\n', sectionIdx) + 1
  const rest = content.slice(afterHeader)
  const nextSection = rest.search(/^#{1,3}\s/m)
  const section = nextSection >= 0 ? rest.slice(0, nextSection) : rest
  return unique(wikiLinks(section, 'パタン'))
}

function intersects(a, b) {
  const bSet = new Set(b)
  return a.filter((item) => bSet.has(item))
}

function linkedEitherWay(a, b, patternData) {
  return patternData.get(a)?.allPatternLinks.includes(b) || patternData.get(b)?.allPatternLinks.includes(a)
}

function topPairs(patternData, getItems, minShared, limit) {
  const names = [...patternData.keys()]
  const pairs = []
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i]
      const b = names[j]
      if (linkedEitherWay(a, b, patternData)) continue
      const shared = intersects(getItems(patternData.get(a)), getItems(patternData.get(b)))
      if (shared.length < minShared) continue
      pairs.push({ a, b, shared })
    }
  }
  return pairs
    .sort(
      (x, y) =>
        y.shared.length - x.shared.length ||
        x.a.localeCompare(y.a, 'ja') ||
        x.b.localeCompare(y.b, 'ja'),
    )
    .slice(0, limit)
}

function parseUnpatternedIssues() {
  const file = join(DIRS.maintenance, '未パタン化の論点.md')
  if (!existsSync(file)) return []
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  return lines
    .filter((line) => line.startsWith('| ') && !line.includes('---') && !line.includes('論点 | 出典文献'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 3)
    .filter(([issue, source, target]) => {
      const sampleText = `${issue} ${source} ${target}`
      return !sampleText.includes('文献ページの「展開したい問い」') && !sampleText.includes('文献ページへのリンク')
    })
    .map(([issue, source, target]) => ({ issue, source, target }))
}

function collectPatternData() {
  const patternFiles = markdownFiles(DIRS.patterns)
  const data = new Map()
  for (const file of patternFiles) {
    const name = pageName(file)
    const content = readFileSync(join(DIRS.patterns, file), 'utf8')
    data.set(name, {
      name,
      allPatternLinks: unique(wikiLinks(content, 'パタン').filter((link) => link !== name)),
      relatedPatternLinks: extractRelatedPatternLinks(content).filter((link) => link !== name),
      literatureLinks: unique(wikiLinks(content, '文献')),
      conceptLinks: unique(wikiLinks(content, '概念')),
      practiceLinks: unique(wikiLinks(content, '実践')),
    })
  }
  return data
}

function collectPracticeClusters(patternData) {
  const practiceToPatterns = new Map()

  for (const [pattern, data] of patternData) {
    for (const practice of data.practiceLinks) {
      if (!practiceToPatterns.has(practice)) practiceToPatterns.set(practice, new Set())
      practiceToPatterns.get(practice).add(pattern)
    }
  }

  for (const file of markdownFiles(DIRS.practices)) {
    const practice = pageName(file)
    const content = readFileSync(join(DIRS.practices, file), 'utf8')
    for (const pattern of wikiLinks(content, 'パタン')) {
      if (!patternData.has(pattern)) continue
      if (!practiceToPatterns.has(practice)) practiceToPatterns.set(practice, new Set())
      practiceToPatterns.get(practice).add(pattern)
    }
  }

  const pairs = []
  for (const [practice, patternsSet] of practiceToPatterns) {
    const patterns = [...patternsSet].sort((a, b) => a.localeCompare(b, 'ja'))
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const a = patterns[i]
        const b = patterns[j]
        if (linkedEitherWay(a, b, patternData)) continue
        pairs.push({ a, b, shared: [practice] })
      }
    }
  }

  return pairs
    .sort((x, y) => x.a.localeCompare(y.a, 'ja') || x.b.localeCompare(y.b, 'ja'))
    .slice(0, 30)
}

function renderPairList(pairs, sharedLabel, sharedPrefix, emptyText) {
  if (pairs.length === 0) return [emptyText]
  const lines = []
  for (const pair of pairs) {
    lines.push(
      `- [[パタン/${pair.a}]] ↔ [[パタン/${pair.b}]]`,
      `  - ${sharedLabel}: ${pair.shared.map((item) => `[[${item.includes('/') ? item : `${sharedPrefix}/${item}`}]]`).join('、')}`,
      `  - 提案: 関連パタン欄に \`補完\`、\`発展\`、\`対比\` のどれで結べるか確認する。`,
    )
  }
  return lines
}

function renderIssues(issues) {
  if (issues.length === 0) return ['候補なし。']
  const lines = []
  for (const { issue, source, target } of issues) {
    lines.push(`- ${issue}`)
    lines.push(`  - 出典: ${source}`)
    lines.push(`  - 圧縮先候補: ${target}`)
    lines.push('  - 提案: 既存ページへ吸収できるかを先に確認し、足りなければ draft として小さく作る。')
  }
  return lines
}

const patternData = collectPatternData()
const byLiterature = topPairs(patternData, (data) => data.literatureLinks, 1, 30)
const byConcept = topPairs(patternData, (data) => data.conceptLinks, 1, 30)
const byPractice = collectPracticeClusters(patternData)
const nearPairs = topPairs(patternData, (data) => data.relatedPatternLinks, 2, 30)
const issues = parseUnpatternedIssues()
const today = todayTokyo()

const L = []
L.push('---')
L.push('type: maintenance')
L.push('tags: [メンテナンス, パタン候補, リンク提案]')
L.push(`updated: ${today}`)
L.push('---')
L.push('')
L.push('# 新しいつながりとパタン候補')
L.push('')
L.push(`最終実行: ${today}`)
L.push('')
L.push('このページは、自動生成された提案レポート。本文やリンクはまだ変更していない。')
L.push('候補は「作る」ためではなく、まず「読む・統合する・既存ページに吸収する」ために使う。')
L.push('')
L.push('## 概要')
L.push('')
L.push(`- 対象パタン: ${patternData.size}`)
L.push(`- 共通文献から見つかった未接続ペア: ${byLiterature.length}`)
L.push(`- 共通概念から見つかった未接続ペア: ${byConcept.length}`)
L.push(`- 共通実践から見つかった未接続ペア: ${byPractice.length}`)
L.push(`- 近いパタンの違いに追加したい候補: ${nearPairs.length}`)
L.push(`- 未パタン化の論点: ${issues.length}`)
L.push('')
L.push('---')
L.push('')
L.push('## 1. 共通文献から見つかった新しいつながり')
L.push('')
L.push(...renderPairList(byLiterature, '共通文献', '文献', '候補なし。'))
L.push('')
L.push('## 2. 共通概念から見つかった新しいつながり')
L.push('')
L.push(...renderPairList(byConcept, '共通概念', '概念', '候補なし。'))
L.push('')
L.push('## 3. 共通実践から見つかった新しいつながり')
L.push('')
L.push(...renderPairList(byPractice, '共通実践', '実践', '候補なし。'))
L.push('')
L.push('## 4. 近いパタンの違いに追加したい候補')
L.push('')
L.push('共通する関連パタンが多いが、互いにはまだ直接つながっていないペア。')
L.push('')
L.push(...renderPairList(nearPairs, '共通関連パタン', 'パタン', '候補なし。'))
L.push('')
L.push('## 5. 未パタン化の論点からの候補')
L.push('')
L.push(...renderIssues(issues))
L.push('')
L.push('---')
L.push('')
L.push('## 使い方')
L.push('')
L.push('1. 候補ペアを開き、本文を読む。')
L.push('2. 既存の関連パタン欄に足すなら、[[メンテナンス/関連パタンの関係ラベル]] のラベルを添える。')
L.push('3. 新規パタンに見えても、まず既存パタンへ吸収できないか確認する。')
L.push('4. draft を作る場合は [[パタン作成テンプレート]] を使う。')
L.push('')
L.push('関連: [[メンテナンス/未パタン化の論点]]、[[メンテナンス/関連パタンの関係ラベル]]、[[メンテナンス/文献からパタンを作る]]')
L.push('')

const report = `${L.join('\n')}\n`
mkdirSync(join(ROOT, 'メンテナンス'), { recursive: true })
writeFileSync(CONTENT_REPORT, report, 'utf8')

try {
  mkdirSync('/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/メンテナンス', {
    recursive: true,
  })
  writeFileSync(VAULT_REPORT, report, 'utf8')
} catch (error) {
  console.warn(`Obsidian report could not be written: ${error.message}`)
}

console.log(`suggest-wiki-growth: wrote ${CONTENT_REPORT}`)
