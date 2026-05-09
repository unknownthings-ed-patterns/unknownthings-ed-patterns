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

const replacements = [
  [/\[\[wiki\//g, "[["],
  [/\[\[パタン集\//g, "[[パタン/"],
  [/\[\[パタン\/熟慮的教育材料\]\]/g, "[[パタン/熟慮的教材教具]]"],
  [/\[\[パタン\/予測\]\]/g, "[[パタン/予測（インストラクション）]]"],
  [/\[\[パタン\/失敗\]\]/g, "[[パタン/失敗（インストラクション）]]"],
  [/\[\[パタン\/熟慮的安全性\]\]/g, "[[パタン/心理的安全性（コンフォートゾーン）]]"],
  [/\[\[パタン\/コレクション\]\]/g, "[[パタン/コレクションと趣味]]"],
  [/\[\[パタン\/ビッグ・メッセージ\]\]/g, "[[パタン/ビッグメッセージ]]"],
  [/\[\[パタン\/ポートフォリオ\]\]/g, "[[パタン/ポートフォリオファイル]]"],
  [/\[\[パタン\/外部と内部の視点を取り入れる\]\]/g, "[[パタン/内部と外部それぞれの視点を取り入れる]]"],
  [/\[\[パタン\/経済を原理とする\]\]/g, "[[メタパタン/経済を原理とする]]"],
  [/\[\[パタン\/制限化\]\]/g, "[[パタン/制限化限定化]]"],
  [/\[\[概念\/教育の目標として力能\]\]/g, "[[概念/教育の目標と力能]]"],
  [/\[\[@sumika45379\]\]/g, "@sumika45379"],
  [/\[\[パタン\/\]\]/g, "[パタン](../パタン/)参照"],
  [/\[パタン\]\(\.\.\/パタン\/\)参照 参照/g, "[パタン](../パタン/)参照"],
]

let changed = 0

for (const file of walk(contentDir)) {
  const original = fs.readFileSync(file, "utf8")
  let next = original

  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement)
  }

  if (next !== original) {
    fs.writeFileSync(file, next)
    changed += 1
  }
}

console.log(`Normalized links in ${changed} Markdown file(s).`)
