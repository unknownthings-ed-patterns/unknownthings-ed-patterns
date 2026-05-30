/**
 * generate-cluster-diagrams.mjs
 * 各パタンファイルの ## 関連パタン セクションからMermaid星形クラスター図を生成する。
 * ## クラスター図 セクション内に <!-- cluster: manual --> があるファイルはスキップ。
 * sync-obsidian.sh から呼び出される。
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const VAULT = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'
const MIN_LINKS = 2   // 関連パタンリンクがこれ未満のファイルは図を生成しない

function extractRelatedLinks(content) {
  // Two-pass: try to find section bounded by next heading; fall back to end of file
  const m = content.match(/^#{2,3}\s*関連パタン([\s\S]*?)(?=^#{1,3}\s)/m)
          || content.match(/^#{2,3}\s*関連パタン([\s\S]*)$/m)
  if (!m) return []
  return [...m[1].matchAll(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)]
    .map(r => r[1].trim())
    .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
    .slice(0, 14) // cap at 14 related nodes for readability
}

function nodeId(name) {
  // Use full hex to avoid collisions between patterns sharing the same prefix
  return 'n' + Buffer.from(name).toString('hex')
}

function buildDiagram(hubName, relatedNames) {
  const hubId = nodeId(hubName)
  const lines = ['flowchart LR', `    ${hubId}["${hubName}"]`]

  for (const r of relatedNames) {
    lines.push(`    ${nodeId(r)}["${r}"]`)
  }
  lines.push('')
  for (const r of relatedNames) {
    lines.push(`    ${hubId} --- ${nodeId(r)}`)
  }
  lines.push('')
  lines.push(`    classDef hub fill:#f0f0f0,stroke:#555,color:#000,font-weight:bold`)
  lines.push(`    class ${hubId} hub`)

  return lines.join('\n')
}

function updateClusterSection(content, hubName, relatedNames) {
  const diagram = buildDiagram(hubName, relatedNames)
  const newSection = `## クラスター図\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n`

  // Replace existing cluster section
  if (/^## クラスター図/m.test(content)) {
    return content.replace(
      /^## クラスター図[\s\S]*?(?=^## |\Z)/m,
      newSection + '\n'
    )
  }

  // Insert before ## Actionable Insight
  if (/^## Actionable Insight/m.test(content)) {
    return content.replace(
      /^## Actionable Insight/m,
      newSection + '\n## Actionable Insight'
    )
  }

  // Append at end
  return content.trimEnd() + '\n\n' + newSection
}

let generated = 0
let skipped = 0
let tooFew = 0

for (const fname of readdirSync(VAULT).sort()) {
  if (!fname.endsWith('.md')) continue

  const fpath = join(VAULT, fname)
  const content = readFileSync(fpath, 'utf8')

  // Skip manually crafted diagrams
  if (content.includes('<!-- cluster: manual -->')) {
    skipped++
    continue
  }

  const hubName = fname.replace(/\.md$/, '')
  const related = extractRelatedLinks(content)

  if (related.length < MIN_LINKS) {
    tooFew++
    continue
  }

  const updated = updateClusterSection(content, hubName, related)
  if (updated !== content) {
    writeFileSync(fpath, updated, 'utf8')
    generated++
  }
}

console.log(`Cluster diagrams: ${generated} generated, ${skipped} manual (skipped), ${tooFew} too few links (skipped)`)
