import fs from "node:fs"
import path from "node:path"

const patternDir = "content/パタン"
const mainIndex = "content/パタン名インデックス.md"
const allPatternList = "content/全パタン一覧.md"
const candidateList = "content/メンテナンス/主要パタン候補.md"
const contentDir = "content"
const mode = process.argv.includes("--check") ? "check" : "write"

const collator = new Intl.Collator("ja")

function read(file) {
  return fs.readFileSync(file, "utf8")
}

function patternNames() {
  return fs
    .readdirSync(patternDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "index.md")
    .map((entry) => path.basename(entry.name, ".md"))
    .sort(collator.compare)
}

function patternFile(name) {
  return path.join(patternDir, `${name}.md`)
}

function markdownFiles(dir = contentDir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name)
    if (entry.isDirectory()) return markdownFiles(filePath)
    if (entry.isFile() && entry.name.endsWith(".md")) return [filePath]
    return []
  })
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/)
  return match?.[1] ?? ""
}

function hasTag(markdown, tag) {
  return frontmatter(markdown).includes(tag)
}

function tags(markdown) {
  const fm = frontmatter(markdown)
  const inline = fm.match(/^tags:\s*\[([^\]]*)\]/m)
  if (inline) {
    return inline[1]
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  const block = fm.match(/^tags:\s*\n((?:\s*-\s*.+\n?)+)/m)
  if (block) {
    return block[1]
      .split("\n")
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean)
  }

  return []
}

function indexedPatternNames() {
  const markdown = read(mainIndex)
  return new Set(
    Array.from(markdown.matchAll(/\[\[パタン\/([^\]|\n]+)(?:\|[^\]\n]+)?\]\]/g), (match) => match[1]),
  )
}

function rowFor(name) {
  const first = name.normalize("NFKC")[0]
  if (!first) return "その他"
  if (/^[A-Za-z0-9]/.test(first)) return "英数字"
  if ("あいうえおアイウエオ".includes(first)) return "ア行"
  if ("かきくけこがぎぐげごカキクケコガギグゲゴ".includes(first)) return "カ行"
  if ("さしすせそざじずぜぞサシスセソザジズゼゾ".includes(first)) return "サ行"
  if ("たちつてとだぢづでどタチツテトダヂヅデド".includes(first)) return "タ行"
  if ("なにぬねのナニヌネノ".includes(first)) return "ナ行"
  if ("はひふへほばびぶべぼぱぴぷぺぽハヒフヘホバビブベボパピプペポ".includes(first)) return "ハ行"
  if ("まみむめもマミムメモ".includes(first)) return "マ行"
  if ("やゆよヤユヨ".includes(first)) return "ヤ行"
  if ("らりるれろラリルレロ".includes(first)) return "ラ行"
  if ("わをんワヲン".includes(first)) return "ワ行"
  return "その他"
}

function backlinkCounts(names) {
  const counts = new Map(names.map((name) => [name, 0]))
  const excluded = new Set([allPatternList, candidateList, mainIndex, "content/index.md"])
  const files = markdownFiles().filter((file) => !excluded.has(file) && !file.startsWith("content/メンテナンス/"))
  for (const file of files) {
    const markdown = read(file)
    for (const match of markdown.matchAll(/\[\[パタン\/([^\]|\n]+)(?:\|[^\]\n]+)?\]\]/g)) {
      if (counts.has(match[1])) counts.set(match[1], counts.get(match[1]) + 1)
    }
  }
  return counts
}

function patternGroups(names) {
  return {
    parents: names.filter((name) => {
      const markdown = read(patternFile(name))
      return hasTag(markdown, "上位パタン") || markdown.includes("## 下位パタン一覧")
    }),
    questions: names.filter((name) => {
      const markdown = read(patternFile(name))
      return name.includes("問い") || hasTag(markdown, "熟慮的問い")
    }),
    sequences: names.filter((name) => {
      const markdown = read(patternFile(name))
      return hasTag(markdown, "熟慮的配列") || markdown.includes("[[パタン/熟慮的配列]]")
    }),
  }
}

function listItems(names) {
  return names.map((name) => `- [[パタン/${name}]]`)
}

function tagText(name) {
  const visibleTags = tags(read(patternFile(name)))
    .filter((tag) => tag !== "パタン")
    .slice(0, 4)
  if (!visibleTags.length) return ""
  return ` — ${visibleTags.map((tag) => `#${tag}`).join(" ")}`
}

function indexCandidates(names, indexedNames, counts) {
  return names
    .filter((name) => !indexedNames.has(name))
    .map((name) => {
      const markdown = read(patternFile(name))
      const parent = hasTag(markdown, "上位パタン") || markdown.includes("## 下位パタン一覧")
      const count = counts.get(name) ?? 0
      const score = count + (parent ? 20 : 0)
      return { name, count, parent, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.count - a.count || collator.compare(a.name, b.name))
    .slice(0, 40)
}

function renderCandidates(names, indexedNames, counts) {
  const candidates = indexCandidates(names, indexedNames, counts)
  const lines = [
    "---",
    "title: 主要パタン候補",
    "---",
    "",
    "# 主要パタン候補",
    "",
    "このページは `scripts/pattern-index.mjs` で自動生成するメンテナンス用リスト。",
    "",
    "主要パタン名インデックスに未掲載で、他ページからの参照が多いパタンや親パタンを追加候補として並べる。",
    "",
    "| パタン | 参照数 | 親パタン | スコア |",
    "| --- | ---: | --- | ---: |",
    ...candidates.map((item) => `| [[パタン/${item.name}]] | ${item.count} | ${item.parent ? "yes" : ""} | ${item.score} |`),
    "",
  ]
  return lines.join("\n")
}

function renderAllPatterns(names, indexedNames, counts) {
  const groups = new Map()
  for (const name of names) {
    const row = rowFor(name)
    if (!groups.has(row)) groups.set(row, [])
    groups.get(row).push(name)
  }

  const order = ["英数字", "ア行", "カ行", "サ行", "タ行", "ナ行", "ハ行", "マ行", "ヤ行", "ラ行", "ワ行", "その他"]
  const missing = names.filter((name) => !indexedNames.has(name))
  const { parents, questions, sequences } = patternGroups(names)

  const lines = [
    "---",
    "title: 全パタン一覧",
    "---",
    "",
    "# 全パタン一覧",
    "",
    "このページは `scripts/pattern-index.mjs` で自動生成する全パタンの索引。",
    "",
    `- 全パタン数：${names.length}`,
    `- [[パタン名インデックス|主要パタン名インデックス]] 掲載数：${indexedNames.size}`,
    `- 主要パタン名インデックス未掲載：${missing.length}`,
    "",
    "主要な入口としては [[パタン名インデックス|主要パタン名インデックス]] を使い、全件確認や抜け漏れ確認にはこのページを使う。",
    "",
    "## 探し方",
    "",
    "- [親パタン・上位パタンを見る](#親パタン上位パタン)",
    "- [問い系を見る](#問い系)",
    "- [配列系を見る](#配列系)",
    "- [五十音順ですべて見る](#五十音順)",
    "",
    "## 親パタン・上位パタン",
    "",
    ...listItems(parents),
    "",
    "## 問い系",
    "",
    ...listItems(questions),
    "",
    "## 配列系",
    "",
    ...listItems(sequences),
    "",
    "## 五十音順",
    "",
  ]

  for (const row of order) {
    const items = groups.get(row)
    if (!items?.length) continue
    lines.push(`## ${row}`, "")
    for (const name of items) {
      lines.push(`- [[パタン/${name}]]${tagText(name)}`)
    }
    lines.push("")
  }

  return `${lines.join("\n").trim()}\n`
}

const names = patternNames()
const indexed = indexedPatternNames()
const counts = backlinkCounts(names)
const next = renderAllPatterns(names, indexed, counts)
const candidatesNext = renderCandidates(names, indexed, counts)
const missing = names.filter((name) => !indexed.has(name))

if (mode === "check") {
  const current = fs.existsSync(allPatternList) ? read(allPatternList) : ""
  if (current !== next) {
    console.error(`${allPatternList} is out of date. Run: npm run update:pattern-list`)
    process.exit(1)
  }
  const currentCandidates = fs.existsSync(candidateList) ? read(candidateList) : ""
  if (currentCandidates !== candidatesNext) {
    console.error(`${candidateList} is out of date. Run: npm run update:pattern-list`)
    process.exit(1)
  }
  console.log(
    `OK: ${names.length} patterns; ${indexed.size} in main index; ${missing.length} only in all-pattern list.`,
  )
} else {
  fs.writeFileSync(allPatternList, next)
  fs.writeFileSync(candidateList, candidatesNext)
  console.log(
    `Updated ${allPatternList}: ${names.length} patterns; ${indexed.size} in main index; ${missing.length} only in all-pattern list.`,
  )
}
