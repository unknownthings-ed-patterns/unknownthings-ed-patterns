# 報告：Gentner (1983) 統合の下書き — 中止

作業日：2026-10-11（`date '+%Y-%m-%d'` で確認）
ブランチ：`claude/zealous-ritchie-i3g2gn`

## 結論

**原文を取得できなかったので、手順1で止めました。** 文献ページ、新しいパタン、edits.json、index_section.md はどれも作っていません（推測で書かないため）。

## 原文の取得を試した記録

| 試した URL | 結果 |
|---|---|
| https://groups.psych.northwestern.edu/gentner/papers/Gentner83.2b.pdf （指定の URL） | 失敗。curl はプロキシの CONNECT で 403（この環境のネットワーク方針が拒否）。WebFetch は名前解決できず（ENOTFOUND） |
| 同じ PDF の Web アーカイブ（web.archive.org） | 失敗。curl は 403、WebFetch は取得不可 |
| https://apps.dtic.mil/sti/pdfs/ADA122891.pdf | 失敗。curl は 403 |
| https://www.ideals.illinois.edu/items/17910/bitstreams/64201/data.pdf | 失敗。curl は 403 |

- 1頁目の題名・著者の確認：**できていません**（PDF を一度も開けていないため）。
- 参考：検索結果によると、DTIC の PDF は 1982 年の技術報告版（BBN Report No. 5192）です。*Cognitive Science* 7(2) の掲載版とは別の版なので、取得できても代わりにはせず、頁数・文言の違いを確かめてから使う必要があります。

## 再開するには（人が決めること）

次のどちらかが必要です。

1. クラウド環境の設定（セッションのタイトルバー → クラウド環境メニュー → Edit → Network access）で、`groups.psych.northwestern.edu` を Allowed domains に足す。手順は https://code.claude.com/docs/en/cloud-environments#network-access にあります。
2. 手元で PDF を取得して、リポジトリ（例：`drafts/gentner1983/source/Gentner83.2b.pdf`）にコミットする。※公開リポジトリに論文 PDF を置いてよいかは、別に判断してください。

## 参考：wiki 内の言及の洗い出し（手順2の grep だけ。原文と照合していない）

`grep -rn "Gentner\|ゲントナー\|ジェントナー" content/` の結果を、引いている年ごとに分けました。「ジェントナー」の表記は 0 件です。**照合区分（一致／言いすぎ／…）は原文を読むまで付けていません。**

### Gentner 1983 を明示して引いているもの（照合の主な対象）
- `パタン/類推（アナロジー）.md:19–21` — 「表面的類似 vs 構造的類似（Gentner, 1983, 1989）」、SMT の核心
- `パタン/二つの世界の橋（現象と数式を往来する）.md:60, 68` — 「Gentner（1983, 1989）の構造マッピング理論」、電気と水流のアナロジー
- `文献/Analogical Reasoning in Science（Nappo & Valente）.md:21` — 「Gentnerの構造マッピング理論（1983, 1989, 2010）」、関係マッチング

### 年を書かずに構造写像理論（SMT）として引いているもの（1983 由来かどうか、要確認）
- `文献/読み書き教育における類推的学習の研究（第二版）.md:19, 28`
- `パタン/類推的学習③.md:31, 53, 65`
- `パタン/類推的学習②.md:30`（「heuristic vs inductive view」は出どころの確認が必要）
- `パタン/比較で概念をつくる（事例ペアの設計）.md:19, 27, 34`（出典欄は Gentner 2010）

### 別の文献に由来するもの（指示どおり、照合では「確かめられない」の扱いになる見込み）
- Gentner 1993: 683 「No difference without similarity.」— `パタン/類推（アナロジー）.md:23`、`パタン/二つの世界の橋（現象と数式を往来する）.md:78`、`文献/Analogical Reasoning in Science（Nappo & Valente）.md:36`、`パタン/類推的学習②.md:24`
- Gentner 2010: 754 の4学習モード — `パタン/類推（アナロジー）.md:27`、`パタン/類推的学習①.md:20–31`、`パタン/類推的学習②.md:20`、`パタン/類推的学習③.md:20–33`、`文献/Analogical Reasoning in Science（Nappo & Valente）.md:38`
- Gentner 2015 の筋かい実験 — `パタン/知識から技能へ.md:104–106, 248`、`概念/知識から技能へ.md:35`

## 走らせた検査と、走らせていない検査

- 走らせた：上記の grep、原文 URL への接続（すべて失敗）
- 走らせていない：引用の機械照合、リンク実在確認、anchor の一意性確認、「〜させる」の grep（下書きがないため対象なし）、lint-wiki.mjs
