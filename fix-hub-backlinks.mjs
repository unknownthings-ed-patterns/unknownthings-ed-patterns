/**
 * fix-hub-backlinks.mjs
 * ハブパタンに片方向で参照しているパタンの逆参照を追加する（① 非対称リンク削減）
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const DRY_RUN = process.argv.includes('--dry-run')

const VAULT = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'
const files = readdirSync(VAULT).filter(f => f.endsWith('.md') && f !== 'index.md')
const patternNames = new Set(files.map(f => f.replace(/\.md$/, '')))

// 全パタンのリンクを収集
const data = new Map()
for (const fname of files) {
  const name = fname.replace(/\.md$/, '')
  const content = readFileSync(join(VAULT, fname), 'utf8')
  const sectionIdx = content.search(/^#{2,3}\s*(?:関連パタン|パタンのつながり)/m)
  let links = []
  if (sectionIdx >= 0) {
    const afterHeader = content.indexOf('\n', sectionIdx) + 1
    const bodyAndRest = content.slice(afterHeader)
    const nextSecIdx = bodyAndRest.search(/^#{1,3} /m)
    const section = nextSecIdx >= 0 ? bodyAndRest.slice(0, nextSecIdx) : bodyAndRest
    links = [...section.matchAll(/\[\[パタン\/([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map(m => m[1].trim())
  }
  data.set(name, { links: [...new Set(links)] })
}

// ハブパタンと、そのパタンにリンクしているが逆参照がないパタンのリスト
// hubs = null で全パタンを対象にする
const hubs = null
/* 以前のハブリスト（参照用）
const _hubs = [
  'ライティング・ワークショップ','ブッククラブ','読みとつながる','シグニファイア',
  '謎・驚きの感覚','ソーシャル','認知的コンフリクト','望ましい困難','多方興味',
  '非可視の教師','フィードバック文化','胚細胞モデル','表現して学ぶ','内容',
  '深める問い','個別化','発問を問いにしない','既知から未知へ','ダイアログ',
  '好奇心から多方興味へ','語りによる精緻化','類推的学習①','価値','可視化',
  'コミュニティのリズムを生み出す','解決から抽象へ','一人の発言をみんなに広げる',
  'ポジティブフィードバック','チェックイン（Checking In）','リーダーズ・ノート',
  'なぜ？（問い）','制限化限定化','アイロニー的理解','複線型授業','見てから聞く',
  '失敗を組み込む','エラー分析','読み聞かせ','一流から学ぶ','自己調整',
  'グループ学習','アリテラシー（読む意志）','問いを大切にする','ナッジ',
  '操作物による概念形成','合図システム','ギャップを埋める行動','知識から技能へ',
  '内発的動機付け','授業の中で批評する','作家のクラフト','考える文化',
  'バイアス破壊','与えられているものは何か（問い）','教育＝成長','精緻化',
  'ドキュメンテーション','作ることで学ぶ','課題設定','教育目的',
  'Consolidation（収束の時間）','大切な友だち（クリティカルフレンド）',
  'リーディング・ワークショップ','全体から局所スキルへ','深い理解（3水準の読解）',
  '最終イメージ（目指す具体の姿）','反省的思考の5段階','概念型の目標',
  '間違いや失敗から学ぶ文化','さまざまなレベルの参加を奨励する',
  '分散型リーダーシップ','到達レベルの自己評価','適切な行動に注目する',
  '知識と人間的意味','ライターズ・ノート','問題の意識化','スタミナを育てる',
  '確認の原則','教育の目標として力能','省察的評価','読むことから書くことへ',
  '具体から抽象へ','アドベンチャー','文化をつくる','ナンバートーク',
  'Iメッセージ','算数シンキング・タスク','審美的交渉','数学ワークショップ',
  '教室図書館','単純から複雑へ','Launch Script（タスクの渡し方）','予告',
  'ゲーム','進化的設計','親近感と刺激を組み合わせる','比較（問い）',
  '事実か（信憑性）','チャレンジ理解','文化の人格','目標設定',
  'テストを繰り返す','注意焦点化方略','三行日記','受け手（相手意識）',
  '多様な演習レベル','ジェスチャー学習','実例を比べて分析する','繰り返し',
  '推論のはしご','フィードバックシステム','読書パートナーシップ',
  '学習する学校','被教育者は一時に一つの学習物を協働して話し合う',
  '理解確認','ゴールと実際のパフォーマンスレベルを比べる',
  '話す・描く・書く','もっと特殊な問題は（特殊化）',
  'これと似たもっと簡単な問題は','思考の可視化','ゴールドスター',
  '修正を受け入れる','早期警告','フィードバックの要請','他には？（問い）',
  'オンボーディング','イメージ','悪い実例を示す','説明による精緻化',
  'スキル化','自ら考え動く指示','産婆役としての教師',
  '橋渡し推論（命題間の関係の明示化）','豊かな課題','手順',
  '類推（アナロジー）','動かす指示','作家のように読む',
]
*/

// hubs=null のとき全パタンを対象にする
const targets = hubs ?? [...patternNames]

let totalFixed = 0

for (const hub of targets) {
  const hubLinks = new Set(data.get(hub)?.links ?? [])
  const missing = []
  for (const [name, { links }] of data) {
    if (name === hub) continue
    if (links.includes(hub) && !hubLinks.has(name)) missing.push(name)
  }
  if (missing.length === 0) continue

  const fpath = join(VAULT, `${hub}.md`)
  let content = readFileSync(fpath, 'utf8')

  // 関連パタンセクション内にのみ存在チェック（テーブル等への出現は別物として扱う）
  const secIdx = content.search(/^## (?:関連パタン|パタンのつながり)/m)
  let sectionContent = ''
  if (secIdx >= 0) {
    const afterHdr = content.indexOf('\n', secIdx) + 1
    const rest = content.slice(afterHdr)
    const nextSec = rest.search(/^## /m)
    sectionContent = nextSec >= 0 ? rest.slice(0, nextSec) : rest
  }
  const reallyMissing = missing.filter(p => !sectionContent.includes(`[[パタン/${p}]]`))
  if (reallyMissing.length === 0) continue

  const linksToAdd = reallyMissing.sort((a, b) => a.localeCompare(b, 'ja')).map(p => `- [[パタン/${p}]]`).join('\n')

  const kanrenSection = /^## 関連パタン/m
  const tsunagariSection = /^## パタンのつながり/m

  if (kanrenSection.test(content) || tsunagariSection.test(content)) {
    const header = kanrenSection.test(content) ? '## 関連パタン' : '## パタンのつながり'
    content = content.replace(
      new RegExp('(^' + header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?)(\\n^##|\\n?$)', 'm'),
      (_, sec, end) => `${sec.trimEnd()}\n${linksToAdd}${end}`
    )
  } else {
    content = content.trimEnd() + `\n\n## 関連パタン\n\n${linksToAdd}\n`
  }

  if (!DRY_RUN) writeFileSync(fpath, content, 'utf8')
  totalFixed += reallyMissing.length
  console.log(`${DRY_RUN ? '[dry-run] ' : ''}✓ ${hub}: +${reallyMissing.length} 件`)
}

console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}完了: 合計 ${totalFixed} 件の逆参照を追加しました。`)
