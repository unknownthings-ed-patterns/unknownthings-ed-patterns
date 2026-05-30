/**
 * rename-pattern.mjs
 * パタンファイルをリネームし、全Wikiディレクトリの [[パタン/旧名]] を [[パタン/新名]] に一括更新する。
 * Usage: node rename-pattern.mjs "旧名" "新名" [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync } from 'fs'
import { join } from 'path'

const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
const DRY_RUN = process.argv.includes('--dry-run')
const [oldName, newName] = args

if (!oldName || !newName) {
  console.error('Usage: node rename-pattern.mjs "旧名" "新名" [--dry-run]')
  process.exit(1)
}

const BASE = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki'
const VAULT = join(BASE, 'パタン')
const DIRS = [
  { path: join(BASE, 'パタン'),   label: 'パタン'   },
  { path: join(BASE, '文献'),     label: '文献'     },
  { path: join(BASE, '実践'),     label: '実践'     },
  { path: join(BASE, '概念'),     label: '概念'     },
  { path: join(BASE, '学級経営'), label: '学級経営' },
  { path: join(BASE, '特別支援'), label: '特別支援' },
  { path: join(BASE, '教科'),     label: '教科'     },
]

const oldPath = join(VAULT, `${oldName}.md`)
const newPath = join(VAULT, `${newName}.md`)

if (!existsSync(oldPath)) {
  console.error(`パタンファイルが見つかりません: パタン/${oldName}.md`)
  process.exit(1)
}
if (existsSync(newPath)) {
  console.error(`同名のパタンが既に存在します: パタン/${newName}.md`)
  process.exit(1)
}

const escapedOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const linkRe = new RegExp(`\\[\\[パタン/${escapedOld}(\\|[^\\]]*)?\\]\\]`, 'g')

// ファイルリネーム
if (!DRY_RUN) {
  renameSync(oldPath, newPath)
}
console.log(`${DRY_RUN ? '[dry-run] ' : ''}ファイルリネーム: パタン/${oldName}.md → パタン/${newName}.md`)

// 全ディレクトリのリンクを一括置換
let totalFiles = 0
let totalReplacements = 0

for (const { path: dirPath, label } of DIRS) {
  let dirFiles
  try {
    dirFiles = readdirSync(dirPath).filter(f => f.endsWith('.md'))
  } catch {
    continue
  }

  for (const fname of dirFiles) {
    const fpath = join(dirPath, fname)
    const content = readFileSync(fpath, 'utf8')
    if (!content.includes(`[[パタン/${oldName}`)) continue

    const matches = content.match(linkRe) ?? []
    const count = matches.length
    if (count === 0) continue

    const newContent = content.replace(linkRe, (_, pipe) => `[[パタン/${newName}${pipe ?? ''}]]`)

    if (!DRY_RUN) writeFileSync(fpath, newContent, 'utf8')
    console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}✓ ${label}/${fname} (${count}箇所)`)
    totalFiles++
    totalReplacements += count
  }
}

// リネーム後ファイルの title frontmatter を更新（旧名と一致する場合のみ）
if (!DRY_RUN) {
  const renamedContent = readFileSync(newPath, 'utf8')
  const updated = renamedContent.replace(
    new RegExp(`^title:\\s*${escapedOld}\\s*$`, 'm'),
    `title: ${newName}`
  )
  if (updated !== renamedContent) {
    writeFileSync(newPath, updated, 'utf8')
    console.log(`  ✓ title frontmatter 更新: ${newName}`)
  }
}

console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}完了: ${totalFiles} ファイル / ${totalReplacements} 箇所を更新しました。`)
