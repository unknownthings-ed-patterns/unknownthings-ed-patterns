import fs from "node:fs"
import path from "node:path"

const contentDir = "content"

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const filePath = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(filePath)
    if (entry.isFile() && entry.name.endsWith(".md")) return [filePath]
    return []
  })
}

function normalizeTarget(target) {
  return target
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\.md$/, "")
}

const files = walk(contentDir)
const existing = new Set(files.map((file) => file.replace(/^content\//, "").replace(/\.md$/, "")))
const missing = new Map()
const brokenMarkdownLinks = []
const badMarkdownLinks = []
const brokenAnchorLinks = []
const wikilinkPattern = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]/g
const markdownLinkPattern = /(!?)\[[^\]]*\]\(([^)]+)\)/g
const assetExtensions = new Set([
  ".avif",
  ".css",
  ".gif",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".svg",
  ".webp",
])

function isSkippableMarkdownTarget(target) {
  if (!target) return true
  if (target.startsWith("#") || /^[a-z]+:/i.test(target) || target.startsWith("mailto:")) return true
  const ext = path.extname(target.split("#")[0].split("?")[0]).toLowerCase()
  return assetExtensions.has(ext)
}

function slugifyHeading(heading) {
  return heading
    .trim()
    .replace(/#+$/, "")
    .trim()
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~、。，．・「」『』（）]/g, "")
}

const anchorsByFile = new Map(
  files.map((file) => {
    const text = fs.readFileSync(file, "utf8")
    const anchors = new Set()
    for (const line of text.split("\n")) {
      const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
      if (match) anchors.add(slugifyHeading(match[2]))
    }
    return [file, anchors]
  }),
)

function checkAnchor(file, raw, matchIndex, text) {
  const fragment = raw.split("#")[1]?.split("?")[0]
  if (!fragment) return

  const decoded = decodeURIComponent(fragment)
  const anchor = slugifyHeading(decoded)
  if (anchorsByFile.get(file)?.has(anchor)) return

  brokenAnchorLinks.push({
    file: file.replace(/^content\//, ""),
    line: text.slice(0, matchIndex).split("\n").length,
    target: raw,
  })
}

for (const file of files) {
  const text = fs.readFileSync(file, "utf8")
  for (const match of text.matchAll(wikilinkPattern)) {
    const target = normalizeTarget(match[1])
    if (!target || existing.has(target)) continue

    const source = file.replace(/^content\//, "")
    if (!missing.has(target)) missing.set(target, new Set())
    missing.get(target).add(source)
  }

  for (const match of text.matchAll(markdownLinkPattern)) {
    const isImage = match[1] === "!"
    const raw = match[2].trim()
    if (isImage || isSkippableMarkdownTarget(raw)) continue

    if (raw.startsWith("#")) {
      checkAnchor(file, raw, match.index, text)
      continue
    }

    const target = raw.split("#")[0].split("?")[0]
    if (!target || target.includes(" ")) continue
    const resolved = path.normalize(path.join(path.dirname(file), target))

    if (target.endsWith("/")) {
      const markdownFile = `${resolved.slice(0, -1)}.md`
      if (fs.existsSync(markdownFile)) {
        badMarkdownLinks.push({
          file: file.replace(/^content\//, ""),
          line: text.slice(0, match.index).split("\n").length,
          target: raw,
          fix: target.slice(0, -1) + raw.slice(target.length),
        })
      } else if (!fs.existsSync(resolved) && !fs.existsSync(path.join(resolved, "index.md"))) {
        brokenMarkdownLinks.push({
          file: file.replace(/^content\//, ""),
          line: text.slice(0, match.index).split("\n").length,
          target: raw,
        })
      }
      continue
    }

    const resolvedFile = fs.existsSync(`${resolved}.md`)
      ? `${resolved}.md`
      : fs.existsSync(path.join(resolved, "index.md"))
        ? path.join(resolved, "index.md")
        : null

    if (resolvedFile || fs.existsSync(resolved)) {
      if (raw.includes("#") && resolvedFile) checkAnchor(resolvedFile, raw, match.index, text)
      continue
    }

    brokenMarkdownLinks.push({
      file: file.replace(/^content\//, ""),
      line: text.slice(0, match.index).split("\n").length,
      target: raw,
    })
  }
}

const rows = [...missing.entries()].sort(
  ([targetA, sourcesA], [targetB, sourcesB]) =>
    sourcesB.size - sourcesA.size || targetA.localeCompare(targetB, "ja"),
)

if (
  rows.length === 0 &&
  badMarkdownLinks.length === 0 &&
  brokenMarkdownLinks.length === 0 &&
  brokenAnchorLinks.length === 0
) {
  console.log(`OK: checked ${files.length} Markdown files; no unresolved wikilinks or bad page links.`)
  process.exit(0)
}

if (rows.length > 0) console.error(`Found ${rows.length} unresolved wikilink target(s):`)
for (const [target, sources] of rows) {
  console.error(`\n- ${target} (${sources.size})`)
  for (const source of [...sources].slice(0, 8)) {
    console.error(`  - ${source}`)
  }
  if (sources.size > 8) console.error(`  - ...and ${sources.size - 8} more`)
}

if (badMarkdownLinks.length > 0) {
  console.error(`\nFound ${badMarkdownLinks.length} Markdown link(s) with trailing slash to .md pages:`)
  for (const link of badMarkdownLinks) {
    console.error(`\n- ${link.file}:${link.line}`)
    console.error(`  current: ${link.target}`)
    console.error(`  fix:     ${link.fix}`)
  }
}

if (brokenMarkdownLinks.length > 0) {
  console.error(`\nFound ${brokenMarkdownLinks.length} unresolved Markdown page link(s):`)
  for (const link of brokenMarkdownLinks) {
    console.error(`\n- ${link.file}:${link.line}`)
    console.error(`  target: ${link.target}`)
  }
}

if (brokenAnchorLinks.length > 0) {
  console.error(`\nFound ${brokenAnchorLinks.length} unresolved Markdown anchor link(s):`)
  for (const link of brokenAnchorLinks) {
    console.error(`\n- ${link.file}:${link.line}`)
    console.error(`  target: ${link.target}`)
  }
}

process.exit(1)
