import fs from "node:fs"
import path from "node:path"

const patternDir = "content/パタン"
const mainIndex = "content/パタン名インデックス.md"
const allPatternList = "content/全パタン一覧.md"
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

function renderAllPatterns(names, indexedNames) {
  const groups = new Map()
  for (const name of names) {
    const row = rowFor(name)
    if (!groups.has(row)) groups.set(row, [])
    groups.get(row).push(name)
  }

  const order = ["英数字", "ア行", "カ行", "サ行", "タ行", "ナ行", "ハ行", "マ行", "ヤ行", "ラ行", "ワ行", "その他"]
  const missing = names.filter((name) => !indexedNames.has(name))
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
  ]

  for (const row of order) {
    const items = groups.get(row)
    if (!items?.length) continue
    lines.push(`## ${row}`, "")
    for (const name of items) {
      lines.push(`- [[パタン/${name}]]`)
    }
    lines.push("")
  }

  return `${lines.join("\n").trim()}\n`
}

const names = patternNames()
const indexed = indexedPatternNames()
const next = renderAllPatterns(names, indexed)
const missing = names.filter((name) => !indexed.has(name))

if (mode === "check") {
  const current = fs.existsSync(allPatternList) ? read(allPatternList) : ""
  if (current !== next) {
    console.error(`${allPatternList} is out of date. Run: npm run update:pattern-list`)
    process.exit(1)
  }
  console.log(
    `OK: ${names.length} patterns; ${indexed.size} in main index; ${missing.length} only in all-pattern list.`,
  )
} else {
  fs.writeFileSync(allPatternList, next)
  console.log(
    `Updated ${allPatternList}: ${names.length} patterns; ${indexed.size} in main index; ${missing.length} only in all-pattern list.`,
  )
}
