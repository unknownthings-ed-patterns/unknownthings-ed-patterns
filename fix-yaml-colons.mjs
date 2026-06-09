#!/usr/bin/env node
// YAML フロントマターで値にコロンが含まれていてクォートされていない行を自動修正する
// 例: year: 1762（訳: 2008） → year: "1762（訳: 2008）"
// sync-obsidian.sh の rsync 後・commit 前に実行する

import { readFile, writeFile } from 'fs/promises'
import { join, extname } from 'path'
import { readdir } from 'fs/promises'

const CONTENT_DIR = './content'

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walkDir(full)
    else if (entry.isFile() && extname(entry.name) === '.md') yield full
  }
}

function fixFrontmatter(text) {
  if (!text.startsWith('---')) return { text, changed: false }

  const closeIdx = text.indexOf('\n---', 3)
  if (closeIdx === -1) return { text, changed: false }

  const frontmatter = text.slice(3, closeIdx)
  const closing = text.slice(closeIdx)

  let changed = false

  const fixed = frontmatter.replace(
    /^([ \t]*[a-zA-Z_][\w]*:\s+)([^\n].*)$/gm,
    (match, key, value) => {
      // すでにクォート済み
      if (value.startsWith('"') || value.startsWith("'")) return match
      // 配列・オブジェクト・ブロックスカラー
      if (/^[\[{|>]/.test(value)) return match
      // URL（://を含む）はそのまま
      if (/^https?:\/\//.test(value)) return match
      // 値の中に `: ` または `:\t` があればクォートが必要
      if (/:\s/.test(value)) {
        changed = true
        const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        return `${key}"${escaped}"`
      }
      return match
    }
  )

  if (!changed) return { text, changed: false }
  return { text: '---' + fixed + closing, changed: true }
}

let fixedCount = 0

for await (const filePath of walkDir(CONTENT_DIR)) {
  const text = await readFile(filePath, 'utf-8')
  const { text: fixedText, changed } = fixFrontmatter(text)
  if (changed) {
    await writeFile(filePath, fixedText, 'utf-8')
    fixedCount++
    console.log(`  yaml-fix: ${filePath.replace(CONTENT_DIR + '/', '')}`)
  }
}

if (fixedCount === 0) {
  console.log('YAML colon check: no issues found')
} else {
  console.log(`YAML colon check: ${fixedCount} file(s) fixed`)
}
