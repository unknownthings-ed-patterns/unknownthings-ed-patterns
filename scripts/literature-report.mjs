import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

const contentDir = "content"
const literatureDir = path.join(contentDir, "文献")
const reportPath = path.join(contentDir, "メンテナンス", "文献自動レポート.md")
const validStatuses = new Set(["ingested", "linked", "translated", "integrated"])
const checkMode = process.argv.includes("--check")

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const filePath = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(filePath)
    if (entry.isFile() && entry.name.endsWith(".md")) return [filePath]
    return []
  })
}

function pageName(file) {
  return file.replace(/^content\//, "").replace(/\.md$/, "")
}

function titleOf(file) {
  return path.basename(file, ".md")
}

function wikiLink(page) {
  return `[[${page}]]`
}

function hasSection(body, heading) {
  return new RegExp(`^#{2,3}\\s+${heading}\\s*$`, "m").test(body)
}

function dateValue(value) {
  if (!value) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function todayInTokyo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function sortDateDesc(a, b, field) {
  return dateValue(b.data[field]).localeCompare(dateValue(a.data[field]))
}

const allFiles = walk(contentDir)
const literatureFiles = fs
  .readdirSync(literatureDir)
  .filter((name) => name.endsWith(".md") && !["index.md", "文献.md", "文献ページテンプレート.md"].includes(name))
  .map((name) => path.join(literatureDir, name))
  .sort((a, b) => titleOf(a).localeCompare(titleOf(b), "ja"))

const literaturePages = literatureFiles.map((file) => {
  const raw = fs.readFileSync(file, "utf8")
  const parsed = matter(raw)
  const page = pageName(file)
  const status = parsed.data.literature_status ?? "unset"
  return {
    file,
    page,
    title: titleOf(file),
    raw,
    body: parsed.content,
    data: parsed.data,
    status,
    hasSummary: hasSection(parsed.content, "3行要約"),
    hasUse: hasSection(parsed.content, "このWikiでの使い道"),
    hasRelated: hasSection(parsed.content, "関連するWikiページ"),
    hasQuestions: hasSection(parsed.content, "展開したい問い"),
  }
})

const literatureNames = new Set(literaturePages.map((page) => page.title))
const reverseRefs = new Map([...literatureNames].map((name) => [name, new Set()]))
const wikiRefPattern = /\[\[文献\/([^\]|#]+?)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g

for (const file of allFiles) {
  if (file.startsWith(literatureDir + path.sep)) continue
  const source = pageName(file)
  const text = fs.readFileSync(file, "utf8")
  for (const match of text.matchAll(wikiRefPattern)) {
    const target = match[1].trim()
    if (!reverseRefs.has(target)) continue
    reverseRefs.get(target).add(source)
  }
}

const invalidStatuses = literaturePages.filter((page) => page.status !== "unset" && !validStatuses.has(page.status))
const missingIngested = literaturePages.filter((page) => page.data.type === "literature" && !page.data.ingested)
const missingSummary = literaturePages.filter((page) => !page.hasSummary)
const missingUse = literaturePages.filter((page) => !page.hasUse)
const missingRelated = literaturePages.filter((page) => !page.hasRelated)
const statusCounts = new Map()
for (const page of literaturePages) statusCounts.set(page.status, (statusCounts.get(page.status) ?? 0) + 1)

function pushPageList(lines, pages, limit = 30) {
  for (const page of pages.slice(0, limit)) {
    const refs = reverseRefs.get(page.title)?.size ?? 0
    const ingested = dateValue(page.data.ingested) || "-"
    const updated = dateValue(page.data.updated) || "-"
    lines.push(`| ${wikiLink(page.page)} | \`${page.status}\` | ${ingested} | ${updated} | ${refs} |`)
  }
  if (pages.length > limit) {
    lines.push(`| ... | ... | ... | ... | 残り ${pages.length - limit} 件 |`)
  }
}

const today = todayInTokyo()
const lines = []
lines.push("---")
lines.push("type: maintenance")
lines.push("tags: [メンテナンス, 文献, 自動レポート]")
lines.push(`updated: ${today}`)
lines.push("---")
lines.push("")
lines.push("# 文献自動レポート")
lines.push("")
lines.push(`最終実行: ${today}。対象 ${literaturePages.length} 文献ページ。`)
lines.push("")
lines.push("## 文献成熟度")
lines.push("")
lines.push("| literature_status | 件数 |")
lines.push("|---|---:|")
for (const status of ["unset", "ingested", "linked", "translated", "integrated"]) {
  lines.push(`| \`${status}\` | ${statusCounts.get(status) ?? 0} |`)
}
lines.push("")
lines.push("## 最近取り込まれた文献")
lines.push("")
lines.push("| 文献 | status | ingested | updated | 被参照 |")
lines.push("|---|---|---:|---:|---:|")
pushPageList(lines, [...literaturePages].sort((a, b) => sortDateDesc(a, b, "ingested")), 20)
lines.push("")
lines.push("## 未統合・未設定の文献")
lines.push("")
lines.push("| 文献 | status | ingested | updated | 被参照 |")
lines.push("|---|---|---:|---:|---:|")
pushPageList(
  lines,
  literaturePages.filter((page) => page.status === "unset" || page.status === "ingested"),
  30,
)
lines.push("")
lines.push("## 文献ページlint")
lines.push("")
lines.push("| チェック | 件数 |")
lines.push("|---|---:|")
lines.push(`| 不正な \`literature_status\` | ${invalidStatuses.length} |`)
lines.push(`| \`type: literature\` で \`ingested\` なし | ${missingIngested.length} |`)
lines.push(`| 3行要約なし | ${missingSummary.length} |`)
lines.push(`| このWikiでの使い道なし | ${missingUse.length} |`)
lines.push(`| 関連するWikiページなし | ${missingRelated.length} |`)
lines.push("")
lines.push("## 逆参照TOP20")
lines.push("")
lines.push("| 文献 | 被参照 | 参照元の例 |")
lines.push("|---|---:|---|")
for (const page of [...literaturePages]
  .sort((a, b) => (reverseRefs.get(b.title)?.size ?? 0) - (reverseRefs.get(a.title)?.size ?? 0))
  .slice(0, 20)) {
  const refs = [...(reverseRefs.get(page.title) ?? new Set())]
  const examples = refs.slice(0, 5).map(wikiLink).join("、") || "-"
  lines.push(`| ${wikiLink(page.page)} | ${refs.length} | ${examples} |`)
}
lines.push("")
lines.push("## 逆参照なし")
lines.push("")
const unreferenced = literaturePages.filter((page) => (reverseRefs.get(page.title)?.size ?? 0) === 0)
if (unreferenced.length === 0) {
  lines.push("なし。")
} else {
  for (const page of unreferenced.slice(0, 50)) lines.push(`- ${wikiLink(page.page)}`)
  if (unreferenced.length > 50) lines.push(`- ...残り ${unreferenced.length - 50} 件`)
}
lines.push("")
lines.push("## 次に見るページ")
lines.push("")
lines.push("- [[メンテナンス/文献成熟度ダッシュボード]]")
lines.push("- [[メンテナンス/未パタン化の論点]]")
lines.push("- [[メンテナンス/文献からパタンを作る]]")

fs.writeFileSync(reportPath, lines.join("\n") + "\n", "utf8")

const summary = `literature-report: ${literaturePages.length} pages / invalid status ${invalidStatuses.length} / missing summary ${missingSummary.length} / unreferenced ${unreferenced.length}`

if (checkMode) {
  console.log(summary)
  if (invalidStatuses.length > 0) {
    console.error("Invalid literature_status values:")
    for (const page of invalidStatuses) console.error(`- ${page.page}: ${page.status}`)
    process.exit(1)
  }
  process.exit(0)
}

console.log(`${summary} / wrote ${reportPath}`)
