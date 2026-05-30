/**
 * fix-pattern-citations.mjs
 * パタンページに欠落している [[文献/X]] 引用を追加する（⑤ 引用ゼロ文献の解消）
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DRY_RUN = process.argv.includes('--dry-run')
const VAULT = '/Users/iwaiteruhisa/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/パタン'

// 文献ファイル名 → 追加すべきパタンファイル名のマップ
const citationsToAdd = {
  'Classroom Strategies for Interactive Learning（Buehl）': [
    'BDAフレームワーク', 'テキスト・フレーム', 'アンティシペーション・ガイド',
    '背景知識', 'シンクアラウド', '読解の7プロセス', '規律的リテラシー',
  ],
  'Teaching for Deep Comprehension（Dorn & Soffos）': [
    '深い理解（3水準の読解）', '共有読書（Shared Reading）', '文学討論グループ',
    'テキスト・セット', 'リーディング・ワークショップ', '背景知識', 'ミニレッスン・サイクル',
    'アンカーチャート', 'シンクアラウド', '1対1の面談',
  ],
  'みるみる（個別最適な学び）': [
    '複線型授業', 'パフォーマンス課題', 'オンボーディング',
    '自己調整', '環境調整', 'フィードバック', '胚細胞モデル',
  ],
  '創価教育学体系 3（牧口常三郎）': [
    '産婆役としての教師', '学習と勤労の並行', '経験から出発すること',
    '非可視の教師', '守・破・離（習熟の三段階）', '実物（具体物）', '教師の三方面修養', '教育目的',
  ],
  '創価教育学体系 4（牧口常三郎）': [
    '認識と評価の区別', '内発的動機付け', '学習指導の三方面',
    '経験から出発すること', '守・破・離（習熟の三段階）', '教師の三方面修養', '産婆役としての教師',
  ],
  '社会科教師の授業・学級づくり「仕掛け学」（小倉勝登）': [
    '35プラス1', '三行日記', '一人の発言をみんなに広げる', '提案する文化',
    '問題解決的教材研究', '授業の縦糸と横糸', '1対1の面談', '安心基地',
  ],
  '読み書き教育における類推的学習の研究（第二版）': [
    '類推的学習①', '類推的学習②', '類推的学習③', 'ビッグメッセージ',
  ],
  '一つの教育のパタン・ランゲージ': [
    '教育の目標として力能', '経験から出発すること', '創造力を目標とすること',
    '類推的学習①', '類推的学習②', '物語①', 'ブッククラブ', '類推的学習③',
    'オンボーディング', '上級者向け', 'メタ注意', 'イメージ', '胚細胞モデル',
    '発散し尽くす', 'ビッグメッセージ', 'ナッジ', '知識から技能へ', '概念型の目標',
    'エラー分析', 'ロールモデル', '習慣化脱習慣', '制限化限定化', 'ソーシャル',
    '適切な行動に注目する', 'スキル化', 'ボトルネック', '可視化', '作ることで学ぶ',
    'フィードバック',
  ],
  'メタパタンのパターンリスト（動画記録）': [
    '経験から出発すること', '教育の目標として力能',
  ],
  '教育のパタン・ランゲージ入門': [
    '経験から出発すること', '物語①', 'ブッククラブ',
  ],
  '教育のパタン・ランゲージ図解バージョン変遷記録（動画記録）': [
    '教育の目標として力能', '経験から出発すること',
  ],
}

let totalAdded = 0

for (const [bunken, patterns] of Object.entries(citationsToAdd)) {
  const link = `- [[文献/${bunken}]]`

  for (const pname of patterns) {
    const fpath = join(VAULT, `${pname}.md`)
    let content
    try {
      content = readFileSync(fpath, 'utf8')
    } catch {
      console.warn(`  ✗ ファイルなし: ${pname}`)
      continue
    }

    // 既に引用済みならスキップ
    if (content.includes(`[[文献/${bunken}]]`)) continue

    // ## 出典 セクションを探す
    if (/^## 出典/m.test(content)) {
      // 出典セクションの末尾に追加（次のセクション or ファイル末尾の直前）
      content = content.replace(/(^## 出典[\s\S]*?)(\n^##|\n?$)/m, (_, sec, end) => {
        const trimmed = sec.trimEnd()
        return `${trimmed}\n${link}${end}`
      })
    } else {
      // 出典セクションがない場合、ファイル末尾に追加
      content = content.trimEnd() + `\n\n## 出典\n\n${link}\n`
    }

    if (!DRY_RUN) writeFileSync(fpath, content, 'utf8')
    totalAdded++
    console.log(`  ${DRY_RUN ? '[dry-run] ' : ''}✓ ${pname} ← [[文献/${bunken}]]`)
  }
}

console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}完了: ${totalAdded} 件の引用を追加しました。`)
