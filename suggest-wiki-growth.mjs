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

function canonicalPair(a, b) {
  return [a, b].sort((x, y) => x.localeCompare(y, 'ja')).join(' ↔ ')
}

function completedEitherWay(a, b, completedPairs) {
  return completedPairs.has(canonicalPair(a, b))
}

function topPairs(patternData, getItems, minShared, limit, completedPairs = new Set()) {
  const names = [...patternData.keys()]
  const pairs = []
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i]
      const b = names[j]
      if (linkedEitherWay(a, b, patternData)) continue
      if (completedEitherWay(a, b, completedPairs)) continue
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

function parsePairCell(cell) {
  const links = [...cell.matchAll(/\[\[パタン\/([^\]|#]+?)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)].map((match) =>
    match[1].trim(),
  )
  if (links.length < 2) return null
  return [links[0], links[1]]
}

function parseReflectionLog() {
  const file = join(DIRS.maintenance, 'つながり反映ログ.md')
  if (!existsSync(file)) return { rows: [], completedPairs: new Set() }
  const rows = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| ') && !line.includes('---') && !line.includes('日付 | 候補'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 6)
    .map(([date, pairCell, target, label, change, commit]) => {
      const pair = parsePairCell(pairCell)
      if (!pair) return null
      const [a, b] = pair
      return {
        date,
        a,
        b,
        target,
        label,
        change,
        commit,
        key: canonicalPair(a, b),
      }
    })
    .filter(Boolean)
  return {
    rows,
    completedPairs: new Set(rows.map((row) => row.key)),
  }
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

function collectPracticeClusters(patternData, completedPairs = new Set()) {
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
        if (completedEitherWay(a, b, completedPairs)) continue
        pairs.push({ a, b, shared: [practice] })
      }
    }
  }

  return pairs
    .sort((x, y) => x.a.localeCompare(y.a, 'ja') || x.b.localeCompare(y.b, 'ja'))
    .slice(0, 30)
}

function suggestPairLabel(pair, sourceType) {
  if (sourceType === 'literature') {
    if (pair.shared.length >= 2) {
      return {
        label: '出典',
        reason: '複数の共通文献があるため、同じ根拠から補強される関係として確認する。',
      }
    }
    return {
      label: '補完',
      reason: '同じ文献から生まれた観点として、一緒に読むと働きが強まるか確認する。',
    }
  }

  if (sourceType === 'concept') {
    return {
      label: '補完',
      reason: '同じ概念を共有しているため、同じ考えを別の場面で支える関係として確認する。',
    }
  }

  if (sourceType === 'practice') {
    return {
      label: '実践化',
      reason: '同じ実践の中で働くため、授業手順の中でどう並ぶか確認する。',
    }
  }

  if (sourceType === 'near') {
    return {
      label: '対比',
      reason: '共通する関連パタンが多いため、似ているが何が違うかを書く候補にする。',
    }
  }

  return {
    label: '補完',
    reason: '近い働きを持つ可能性があるため、本文を読んで関係を確認する。',
  }
}

function suggestPairDisposition(sourceType) {
  if (sourceType === 'near') {
    return '新規パタン化しない。まず「近いパタンの違い」または関連パタン欄に、対比として整理する。'
  }
  if (sourceType === 'practice') {
    return '新規パタン化しない。まず実践ページ側の「圧縮されているパタン」と、各パタンの関連欄で接続する。'
  }
  return '新規パタン化しない。まず既存ページの関連パタン欄に、ラベル付きリンクとして追加できるか確認する。'
}

function suggestPairPriority(pair, sourceType) {
  if (sourceType === 'near' && pair.shared.length >= 10) {
    return {
      priority: '高',
      reason: '共通する関連パタンが多く、違いを書くと読者の迷いを減らしやすい。',
    }
  }
  if (sourceType === 'literature' && pair.shared.length >= 2) {
    return {
      priority: '高',
      reason: '複数文献を共有しており、出典にもとづく接続として検討しやすい。',
    }
  }
  if (sourceType === 'practice') {
    return {
      priority: '中',
      reason: '同じ実践内で働くため有用だが、授業手順上の並びを本文で確認する必要がある。',
    }
  }
  if (sourceType === 'concept') {
    return {
      priority: '低',
      reason: '同じ概念に属するだけの可能性があるため、本文を読んでから接続する。',
    }
  }
  return {
    priority: '中',
    reason: 'つながりは見えるが、本文を読んで関係を確かめてから反映する。',
  }
}

function pairKey(pair) {
  return `${pair.a} ↔ ${pair.b}`
}

function pairSearchText(pair) {
  return `${pair.a} ${pair.b} ${pair.shared.join(' ')}`
}

const EDIT_GROUPS = [
  {
    name: '問い系',
    keywords: ['問い', '質問', '発問', '課題', 'アポリア', 'コンフリクト', 'クエスチョニング'],
  },
  {
    name: '読書ワークショップ系',
    keywords: ['読書', 'リーディング', 'ブック', 'カンファリング', 'シンクアラウド', 'テキスト', 'ノート'],
  },
  {
    name: '動機付け系',
    keywords: ['動機', '興味', 'トリガー', '帰属', '予測差分', '有用性', '必要感', 'コミットメント'],
  },
  {
    name: '古典思想系',
    keywords: ['プラトン', 'アリストテレス', 'カント', 'デューイ', 'ソクラテス', '無知', '道徳', 'タウマゼイン'],
  },
  {
    name: '評価・フィードバック系',
    keywords: ['評価', 'フィードバック', 'PICO', 'Outcome', 'Comparison', '成功規準', '評定'],
  },
  {
    name: '熟慮的教材・課題系',
    keywords: ['熟慮的教育材料', '教材', '豊かな課題', '具体物', '実物', '材料'],
  },
]

function editGroupsForPair(pair) {
  const text = pairSearchText(pair)
  return EDIT_GROUPS.filter((group) => group.keywords.some((keyword) => text.includes(keyword))).map(
    (group) => group.name,
  )
}

function annotatePair(pair, sourceType) {
  const label = suggestPairLabel(pair, sourceType)
  const priority = suggestPairPriority(pair, sourceType)
  return {
    ...pair,
    sourceType,
    label,
    priority,
    disposition: suggestPairDisposition(sourceType),
    groups: editGroupsForPair(pair),
  }
}

function renderPairList(pairs, sharedLabel, sharedPrefix, sourceType, emptyText) {
  if (pairs.length === 0) return [emptyText]
  const lines = []
  for (const rawPair of pairs) {
    const pair = annotatePair(rawPair, sourceType)
    lines.push(
      `- [[パタン/${pair.a}]] ↔ [[パタン/${pair.b}]]`,
      `  - ${sharedLabel}: ${pair.shared.map((item) => `[[${item.includes('/') ? item : `${sharedPrefix}/${item}`}]]`).join('、')}`,
      `  - 優先度: \`${pair.priority.priority}\` — ${pair.priority.reason}`,
      `  - 作業状態: [ ] 未確認 / [ ] 読む / [ ] 関連欄へ反映 / [ ] 本文へ吸収 / [ ] 保留 / [ ] 完了`,
      `  - 編集単位: ${pair.groups.length > 0 ? pair.groups.map((group) => `\`${group}\``).join('、') : '`未分類`'}`,
      `  - 仮ラベル: \`${pair.label.label}\` — ${pair.label.reason}`,
      `  - 処理方針: ${pair.disposition}`,
    )
  }
  return lines
}

function countWikiTargets(text, prefix) {
  return [...text.matchAll(new RegExp(String.raw`\[\[${prefix}/`, 'g'))].length
}

function suggestIssueDisposition(target) {
  if (countWikiTargets(target, '実践') > 0) {
    return {
      status: '実践へ',
      reason: '新規パタンを作る前に、実践ページの圧縮や手順として整理できるか確認する。',
    }
  }
  if (countWikiTargets(target, '概念') > 0 && countWikiTargets(target, 'パタン') === 0) {
    return {
      status: '概念へ',
      reason: '独立パタンより、概念ページ側の整理として受け止められる可能性が高い。',
    }
  }
  if (countWikiTargets(target, 'パタン') >= 1) {
    return {
      status: '吸収予定',
      reason: '既存パタンへの接続先があるため、まず本文追記・関連欄・出典欄への吸収を試す。',
    }
  }
  return {
    status: 'draft候補',
    reason: '受け皿が弱い場合だけ、status: draft の小さな新規パタンとして検討する。',
  }
}

function suggestIssuePriority(target) {
  if (countWikiTargets(target, '実践') > 0) {
    return {
      priority: '高',
      reason: '実践ページに反映できるため、読者の使い道に直結しやすい。',
    }
  }
  if (countWikiTargets(target, 'パタン') >= 2) {
    return {
      priority: '高',
      reason: '受け皿になる既存パタンが複数あり、吸収先を比較しながら整理できる。',
    }
  }
  if (countWikiTargets(target, 'パタン') >= 1) {
    return {
      priority: '中',
      reason: '既存パタンに吸収できる可能性があるが、本文確認が必要。',
    }
  }
  return {
    priority: '低',
    reason: '受け皿を先に探してから、新規draftの必要性を判断する。',
  }
}

function renderIssues(issues) {
  if (issues.length === 0) return ['候補なし。']
  const lines = []
  for (const { issue, source, target } of issues) {
    const disposition = suggestIssueDisposition(target)
    const priority = suggestIssuePriority(target)
    lines.push(`- ${issue}`)
    lines.push(`  - 出典: ${source}`)
    lines.push(`  - 圧縮先候補: ${target}`)
    lines.push(`  - 優先度: \`${priority.priority}\` — ${priority.reason}`)
    lines.push(`  - 作業状態: [ ] 未確認 / [ ] 読む / [ ] 本文へ吸収 / [ ] 実践ページへ反映 / [ ] 保留 / [ ] 完了`)
    lines.push(`  - 処理方針: \`${disposition.status}\` — ${disposition.reason}`)
  }
  return lines
}

function flattenPairs() {
  return [
    ...byLiterature.map((pair) => annotatePair(pair, 'literature')),
    ...byConcept.map((pair) => annotatePair(pair, 'concept')),
    ...byPractice.map((pair) => annotatePair(pair, 'practice')),
    ...nearPairs.map((pair) => annotatePair(pair, 'near')),
  ]
}

function renderEditGroups(pairs) {
  const lines = []
  for (const group of EDIT_GROUPS) {
    const grouped = pairs
      .filter((pair) => pair.groups.includes(group.name))
      .sort(
        (a, b) =>
          priorityRank(b.priority.priority) - priorityRank(a.priority.priority) ||
          b.shared.length - a.shared.length ||
          pairKey(a).localeCompare(pairKey(b), 'ja'),
      )
    const uniqueGrouped = []
    const seen = new Set()
    for (const pair of grouped) {
      const key = pairKey(pair)
      if (seen.has(key)) continue
      seen.add(key)
      uniqueGrouped.push(pair)
      if (uniqueGrouped.length >= 8) break
    }
    lines.push(`### ${group.name}`)
    lines.push('')
    if (uniqueGrouped.length === 0) {
      lines.push('候補なし。', '')
      continue
    }
    for (const pair of uniqueGrouped) {
      lines.push(
        `- [[パタン/${pair.a}]] ↔ [[パタン/${pair.b}]]`,
        `  - 優先度: \`${pair.priority.priority}\` / 仮ラベル: \`${pair.label.label}\` / 出所: ${sourceTypeName(pair.sourceType)}`,
        `  - 作業状態: [ ] 未確認 / [ ] 読む / [ ] 反映 / [ ] 保留 / [ ] 完了`,
      )
    }
    lines.push('')
  }
  return lines
}

function renderCompletedReflections(reflections) {
  if (reflections.length === 0) return ['反映済みログなし。']
  const lines = []
  for (const row of reflections) {
    lines.push(
      `- ${row.date}: [[パタン/${row.a}]] ↔ [[パタン/${row.b}]]`,
      `  - ラベル: \`${row.label}\``,
      `  - 反映先: ${row.target}`,
      `  - 変更内容: ${row.change}`,
    )
  }
  return lines
}

function priorityRank(priority) {
  return { 高: 3, 中: 2, 低: 1 }[priority] ?? 0
}

function sourceTypeName(sourceType) {
  return {
    literature: '共通文献',
    concept: '共通概念',
    practice: '共通実践',
    near: '近いパタン',
  }[sourceType]
}

const reflectionLog = parseReflectionLog()
const patternData = collectPatternData()
const byLiterature = topPairs(patternData, (data) => data.literatureLinks, 1, 30, reflectionLog.completedPairs)
const byConcept = topPairs(patternData, (data) => data.conceptLinks, 1, 30, reflectionLog.completedPairs)
const byPractice = collectPracticeClusters(patternData, reflectionLog.completedPairs)
const nearPairs = topPairs(patternData, (data) => data.relatedPatternLinks, 2, 30, reflectionLog.completedPairs)
const issues = parseUnpatternedIssues()
const allAnnotatedPairs = flattenPairs()
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
L.push('仮ラベルと処理方針は、編集の入口を決めるための下書き。最終判断は本文を読んでから行う。')
L.push('')
L.push('## 概要')
L.push('')
L.push(`- 対象パタン: ${patternData.size}`)
L.push(`- 共通文献から見つかった未接続ペア: ${byLiterature.length}`)
L.push(`- 共通概念から見つかった未接続ペア: ${byConcept.length}`)
L.push(`- 共通実践から見つかった未接続ペア: ${byPractice.length}`)
L.push(`- 近いパタンの違いに追加したい候補: ${nearPairs.length}`)
L.push(`- 未パタン化の論点: ${issues.length}`)
L.push(`- 反映ログに記録済みのつながり: ${reflectionLog.rows.length}`)
L.push('')
L.push('## 優先度と状態の見方')
L.push('')
L.push('- `高`: 複数の根拠があり、反映すると読み手の導線が改善しやすい。')
L.push('- `中`: 有望だが、本文を読んで関係を確認してから反映する。')
L.push('- `低`: 同じ概念に属するだけの可能性があり、まず保留気味に読む。')
L.push('- 作業状態は手動でチェックする。自動生成し直すと初期状態に戻るため、完了記録を残す場合は別ページへ移す。')
L.push('')
L.push('## 編集単位別の入口')
L.push('')
L.push(...renderEditGroups(allAnnotatedPairs))
L.push('## 反映済みのつながり')
L.push('')
L.push(...renderCompletedReflections(reflectionLog.rows))
L.push('')
L.push('---')
L.push('')
L.push('## 1. 共通文献から見つかった新しいつながり')
L.push('')
L.push(...renderPairList(byLiterature, '共通文献', '文献', 'literature', '候補なし。'))
L.push('')
L.push('## 2. 共通概念から見つかった新しいつながり')
L.push('')
L.push(...renderPairList(byConcept, '共通概念', '概念', 'concept', '候補なし。'))
L.push('')
L.push('## 3. 共通実践から見つかった新しいつながり')
L.push('')
L.push(...renderPairList(byPractice, '共通実践', '実践', 'practice', '候補なし。'))
L.push('')
L.push('## 4. 近いパタンの違いに追加したい候補')
L.push('')
L.push('共通する関連パタンが多いが、互いにはまだ直接つながっていないペア。')
L.push('')
L.push(...renderPairList(nearPairs, '共通関連パタン', 'パタン', 'near', '候補なし。'))
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
