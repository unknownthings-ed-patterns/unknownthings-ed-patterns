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
const wikilinkPattern = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]/g

for (const file of files) {
  const text = fs.readFileSync(file, "utf8")
  for (const match of text.matchAll(wikilinkPattern)) {
    const target = normalizeTarget(match[1])
    if (!target || existing.has(target)) continue

    const source = file.replace(/^content\//, "")
    if (!missing.has(target)) missing.set(target, new Set())
    missing.get(target).add(source)
  }
}

const rows = [...missing.entries()].sort(
  ([targetA, sourcesA], [targetB, sourcesB]) =>
    sourcesB.size - sourcesA.size || targetA.localeCompare(targetB, "ja"),
)

if (rows.length === 0) {
  console.log(`OK: checked ${files.length} Markdown files; no unresolved wikilinks.`)
  process.exit(0)
}

console.error(`Found ${rows.length} unresolved wikilink target(s):`)
for (const [target, sources] of rows) {
  console.error(`\n- ${target} (${sources.size})`)
  for (const source of [...sources].slice(0, 8)) {
    console.error(`  - ${source}`)
  }
  if (sources.size > 8) console.error(`  - ...and ${sources.size - 8} more`)
}

process.exit(1)
