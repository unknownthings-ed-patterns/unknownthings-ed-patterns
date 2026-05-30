/**
 * new-pattern.mjs
 * 標準構造を持つ新規パタンファイルを生成する。
 * Usage: node new-pattern.mjs "パタン名"
 */

import { writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const name = process.argv[2]
if (!name) {
  console.error('Usage: node new-pattern.mjs "パタン名"')
  process.exit(1)
}

const VAULT = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'
const fpath = join(VAULT, `${name}.md`)

if (existsSync(fpath)) {
  console.error(`既に存在します: パタン/${name}.md`)
  process.exit(1)
}

const today = new Date().toISOString().slice(0, 10)

const template = `---
title: ${name}
date: ${today}
updated: ${today}
status: draft
tags: [パタン]
source: ""
---

<!-- キャッチフレーズ：このパタンを一言で表す問いや宣言 -->

## 背景（Context）

<!-- このパタンが有効な状況・前提条件 -->

## 問題（Problem）

<!-- どんな緊張・矛盾・困難が生じているか -->

## 力のかたち（Forces）

<!-- 相反する力・制約・価値観を列挙する -->

-
-

## 解決（Solution）

<!-- 具体的に何をどうするか -->

## 実践例

<!-- 授業・学校・教室での具体的な使い方 -->

## 結果（Consequences）

<!-- このパタンを適用したときに何が起きるか（良い点・注意点） -->

## 関連パタン

<!-- [[パタン/関連パタン名]] -->

## Actionable Insight

<!-- 明日の教育で試せる具体的な行動を1つ以上 -->

## 出典

<!-- - [[文献/参考文献名]] -->
`

writeFileSync(fpath, template, 'utf8')
console.log(`作成しました: パタン/${name}.md`)

const vaultEncoded = encodeURIComponent('教育のパタン・ランゲージ')
const fileEncoded  = encodeURIComponent(`wiki/パタン/${name}`)
try {
  execSync(`open "obsidian://open?vault=${vaultEncoded}&file=${fileEncoded}"`, { stdio: 'ignore' })
  console.log('Obsidianで開きました。')
} catch {
  console.log('Obsidianを開けませんでした。手動で開いてください。')
}
