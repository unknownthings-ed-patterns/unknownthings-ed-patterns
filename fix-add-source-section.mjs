/**
 * fix-add-source-section.mjs
 * frontmatter の source フィールドを ## 出典 セクションに変換する。
 * 対象: status:complete で ## 出典 がないパタン
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const DRY_RUN = process.argv.includes('--dry-run')

const VAULT = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'
const files = readdirSync(VAULT).filter(f => f.endsWith('.md') && f !== 'index.md')

let edited = 0
for (const fname of files) {
  let content = readFileSync(join(VAULT, fname), 'utf8')
  const statusM = content.match(/^status:\s*(\S+)/m)
  if (statusM?.[1] !== 'complete') continue
  if (/^## 出典/m.test(content)) continue

  const sourceM = content.match(/^source:\s*"?(.+?)"?\s*$/m)
  if (!sourceM) continue

  const sourceVal = sourceM[1].trim()
  // [[文献/X]] 形式ならそのままリンク、そうでなければテキスト
  const sourceLink = sourceVal.startsWith('[[') ? `- ${sourceVal}` : `- ${sourceVal}`

  // Actionable Insight セクションの後ろに挿入（あれば）、なければ末尾
  if (/^## Actionable Insight/m.test(content)) {
    content = content.replace(
      /(^## Actionable Insight[\s\S]*?)(\n^##|\n?$)/m,
      (_, sec, end) => `${sec.trimEnd()}\n\n## 出典\n\n${sourceLink}${end}`
    )
  } else {
    content = content.trimEnd() + `\n\n## 出典\n\n${sourceLink}\n`
  }

  if (!DRY_RUN) writeFileSync(join(VAULT, fname), content, 'utf8')
  edited++
}

console.log(`${DRY_RUN ? '[dry-run] ' : ''}完了: ${edited} ファイルに ## 出典 セクションを追加しました。`)
