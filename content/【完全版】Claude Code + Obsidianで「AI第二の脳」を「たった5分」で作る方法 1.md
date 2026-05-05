---
title: "【完全版】Claude Code + Obsidianで「AI第二の脳」を「たった5分」で作る方法"
source: "https://x.com/sumika45379/status/2048681621432549402"
author:
  - "[[@sumika45379]]"
published: 2026-04-27
created: 2026-05-04
description: "OpenAI創設者11人の1人『Andrej Karpathy』が提唱した「ClaudeCodeでの第2の脳の作り方」。それを５分で誰でも簡単に作る方法をプロンプトも含め、今回の記事に自力で全部まとめました😻とても有益だと思います！ところで皆さん！「毎回ClaudeCodeを開..."
tags:
  - "clippings"
---
![画像](https://pbs.twimg.com/media/HG4HdNnaQAA1uR9?format=jpg&name=large)

OpenAI創設者11人の1人『Andrej Karpathy』が提唱した「ClaudeCodeでの第2の脳の作り方」。それを５分で誰でも簡単に作る方法をプロンプトも含め、今回の記事に自力で全部まとめました😻とても有益だと思います！

ところで皆さん！

「毎回ClaudeCodeを開くたびに、また最初から説明しなきゃいけない」

これ、めちゃくちゃストレスじゃないですか？

![画像](https://pbs.twimg.com/media/HG4JO8RbQAASpnW?format=jpg&name=large)

「わたしはこういう人間で、こういう仕事をしていて、こういう文体で書きたくて……」ってまた言い直す。AIを乗り換えたら全部リセット。前回の会話の続きをしたいのに、全部ゼロから。

これね、実はClaudeCodeの構造上の問題なんです。毎回ゼロから考えさせてるから、いくら使っても「蓄積」がない。

でも最近、Andrej Karpathy（元OpenAI、元Tesla AIディレクター）のポストが超バズって、この問題を根本から解決するシステムが広まってるんです。

![画像](https://pbs.twimg.com/media/HG5Yv5MbQAAU1Ai?format=jpg&name=large)

Claude Code + Obsidianを組み合わせた「AI第二の脳」のシステムです。

わたしも実際に試してみたんですけど、これ本当に今まで使ってきたAI活用の中で一番体感が変わりました。普通のRAG（検索して回答するシステム）とは根本的に違う発想で、使えば使うほど育っていく。

今日はこのシステムを、1個も漏らさず全部書いていきます💖

■ まず「普通のRAG」と何が違うの？

![画像](https://pbs.twimg.com/media/HG4JhFTasAAQMdq?format=jpg&name=large)

で、ここを最初に理解しないと、このシステムの価値が半分も伝わらないので先に説明するね。

NotebookLMとか、ChatGPTへのファイルアップロードとか、いわゆる「RAG」ってこういう仕組みなんです👇

→ ファイルを渡す → 質問するたびにAIが関連する部分を探す → 毎回ゼロから答えを作る → また次の質問がきたら、また同じことをゼロから繰り返す

つまり「何も積み重なってない」んですよね。

でもKarpathyが提唱したのはここが全然違う。

AIが「Wikiを育て続ける」システムなんです。

新しい資料を入れるたびに、AIがその内容を読んで、既存の知識と統合して、矛盾があれば修正して、関連するページを更新する。「知識が一度まとめられて、ずっと最新に保たれ続ける」。

普通のRAGは毎回答えを「発掘」するけど、このシステムは答えを「育て続ける」。ここが根本的な違い。

■ システムの全体像

このシステムには4つの動く部品があります👇

→ ① あなたのデータ（記事・ノート・文字起こし・アイデアなど） → ② 整理（Claude Codeがあなたに代わってObsidianに整理してくれる） → ③ 即座の質問（育てたデータベースにいつでも何でも聞ける） → ④ 進化する記憶（使えば使うほど賢くなる仕組み）

そしてこのシステムは3つの層で成り立ってます👇

![画像](https://pbs.twimg.com/media/HG410JtbAAA9rMT?format=jpg&name=large)

**層1：生のソース（immutableな原資料）**記事・論文・画像・データファイル。AIはここから読むだけで、絶対に書き換えない。あなたの「真実の源泉」。

**層2：Wiki（AIが書き続けるmarkdownファイル群）**要約・人物ページ・概念ページ・比較・概観・総合分析。AIがページを作って、新しいソースが来るたびに更新して、相互参照を保ち続ける。あなたが読む、AIが書く。

**層3：スキーマ（CLAUDE.mdという設定ファイル）**Wikiの構造・ルール・ワークフローをAIに教えるドキュメント。これがあるから「汎用チャットボット」じゃなくて「規律を持ったWiki管理者」として動いてくれる。あなたとAIが一緒に育てていく、一番大事なファイル。

■ AIがWikiでやる3つのオペレーション

![画像](https://pbs.twimg.com/media/HG4J0wFakAA0Dsi?format=jpg&name=large)

**① Ingest（取り込み）**

![画像](https://pbs.twimg.com/media/HG458gXacAAMZIg?format=jpg&name=large)

新しいソースをフォルダに入れて「処理して」と言うだけ。流れはこんな感じ👇

→ AIがソースを読む → あなたとキーポイントについて話す → Wikiにサマリーページを書く → インデックスを更新する → 関連する人物・概念ページを10〜15個更新する → ログに記録する

1つのソースを入れるだけで、10〜15ページが同時に育つ。ここが「蓄積」の正体。

**② Query（質問）**

![画像](https://pbs.twimg.com/media/HG45fBLawAAzpk8?format=jpg&name=large)

Wikiに何でも聞ける。AIが関連ページを探して、読んで、引用付きで答える。

しかも答えの形は何でもOK👇

→ markdownページ → 比較表 → スライドデッキ（Marp形式） → グラフ（matplotlib） → キャンバス

さらに天才なのが、いい答えはそのままWikiに保存できるんです。「あの時のあの比較表」が消えずに次の質問に活かされる。探索がまた積み重なっていく。

**③ Lint（健康チェック）**

![画像](https://pbs.twimg.com/media/HG45a8ba4AAQqMN?format=jpg&name=large)

定期的にAIにWikiの状態を確認してもらう。チェック内容👇

→ ページ間の矛盾 → 新しいソースで古くなったクレーム → リンクがないページ（孤児） → 概念はあるのにページがない場所 → 相互参照の漏れ → 調査できるデータのギャップ

これで、増えても健康な状態が保てる。

■ 2つの特別ファイルについて

![画像](https://pbs.twimg.com/media/HG42DouaYAAI3IT?format=jpg&name=large)

Wikiが育ってくると、AIとあなたが迷子にならないために2つのファイルが重要になります。

**index.md（内容中心）**

Wikiの全ページを一覧化したカタログ。カテゴリ別に各ページのリンクと一行サマリー。AIは質問に答える前にまずここを読んで、関連するページを特定する。100ソース・数百ページ規模でもRAGのインフラなしで機能する、すごく実用的な仕組み。

**log.md（時系列記録）**

何がいつ起きたかを追記だけしていく記録。Ingest・Query・Lintを全部記録。

こんな形式にするとUnixコマンドで検索できます👇

\## \[2026-04-09\] ingest | 記事タイトル

grep "^## \\\[" log.md | tail -5 で最近5件がすぐ見れる。

■ セットアップは本当に5分で終わる

![画像](https://pbs.twimg.com/media/HG4J6u5aEAAR6O8?format=jpg&name=large)

**Step 1：Obsidianをダウンロード**[https://obsidian.md/](https://obsidian.md/) からインストール。

**Step 2：Vaultを作る**

![画像](https://pbs.twimg.com/media/HG420eMbYAAlD8K?format=jpg&name=large)

起動したら「Vault」（デスクトップのフォルダと思えばOK）を作成。名前は何でもいい、わたしは「Obsidian Vault」にしてる。ここにClaudeがアクセスするMarkdownファイルが全部貯まっていく。

**Step 3：Claude Code（デスクトップアプリ）を開く**

![画像](https://pbs.twimg.com/media/HG424FvbYAAimVk?format=jpg&name=large)

メインチャット画面の「フォルダを選択」から、さっき作ったObsidian Vaultを選ぶ。

**Step 4：Karpathyのシステムプロンプトを貼る**

![画像](https://pbs.twimg.com/media/HG4282eaMAA_ylm?format=jpg&name=large)

こちらからコピーできます↓ [https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

ここが肝心。このプロンプトがAIを「汎用チャットボット」から「規律を持ったWiki管理者」に変える設定ファイルになる。

**Step 5：データを入れ始める**

![画像](https://pbs.twimg.com/media/HG43APPaIAA14Wl?format=jpg&name=large)

ここだけは地道な作業。Obsidianは空のノートなので、最初にある程度データを入れないとWikiは育たない。

こんなものが使えます👇 → Notionからエクスポートしたファイル → 過去のメモやアイデア → 書いた記事・読んだ記事 → YouTubeの文字起こし → 「わたしのこと教えて」と他のAIに聞いて出てきた情報

わたしはビジネス計画、書いたYouTube台本、過去の記事、リサーチノートを全部ぶち込みました。最初は大変だけど、一度入れたらあとは育てるだけ💖

■ 使いこなすプロのコツ4選

![画像](https://pbs.twimg.com/media/HG4KcIoacAAoziM?format=jpg&name=large)

**コツ① Obsidian Chrome拡張を使う**

![画像](https://pbs.twimg.com/media/HG43LOEbMAA0pJS?format=jpg&name=large)

ブラウザで記事を読みながら「Obsidianに追加」ボタン1つでMarkdown変換してVaultに送れる。これで日々の情報をどんどん入れられる。

入れたあとはClaudeに「さっき○○っていう記事を入れたから、Wikiに統合して」と言うだけ。Claudeが他のノートとの関連を全部見つけて繋げてくれる。

**コツ② フォルダは2つに分ける**

![画像](https://pbs.twimg.com/media/HG43NhXbMAACp-8?format=jpg&name=large)

Karpathyも推奨してるけど、Vault（フォルダ）は用途別に分けるのがベスト👇 → 仕事・ビジネス用 → プライベート・目標用

混ぜると整理が難しくなる。

**コツ③ メガプロンプト作成に使う**

![画像](https://pbs.twimg.com/media/HG43PlOaEAA2HKe?format=jpg&name=large)

実はこのシステムの一番実用的な使い方は「自分のことを全部知っているAI」にメガプロンプトを作らせること。

自分の文体・価値観・ターゲット読者・過去の記事のパターンが全部Wikiに入ってるから、「わたしの次の記事のプロンプトを作って」と言うだけで、すごく精度が高い指示書が出てくる。普通のプロンプトとは別次元の精度になる。

**コツ④ 「孤児」を定期的にチェックする**

![画像](https://pbs.twimg.com/media/HG43Rv2bkAAz_oc?format=jpg&name=large)

Obsidianの「Orphans（孤児）」機能を使うと、他のノートとリンクが張られていない孤立したページが見れる。

これはWikiの「弱い部分」＝まだ繋がってない概念やアイデアを見つける最高の方法。「この孤立したアイデア、何かと繋げられないかな？」という思考のトリガーになる。

右上の3点メニューから切り替えられます。

■ 上級者向け：CLIツール

![画像](https://pbs.twimg.com/media/HG4LVU4boAAlagg?format=jpg&name=large)

Wikiが大きくなってくると、検索ツールがあると便利。

**qmd**というツールがおすすめ👇

→ Markdownファイル専用のローカル検索エンジン → BM25ベクトルのハイブリッド検索＋LLM再ランク付け → 全部オンデバイスで動く → CLI（シェルから叩ける）とMCPサーバー（Claudeのツールとして使える）両方ある

小規模ならindex.mdで十分だけど、数百ページ超えてきたら導入を検討すると快適になります。

■ このシステムが向かない人

![画像](https://pbs.twimg.com/media/HG4L7fhaAAEk7B4?format=jpg&name=large)

正直に書くね。全員におすすめできる万能ツールじゃないです。

**① 視覚化が好きじゃない人**

Obsidianの一番の魅力はGraph View（ノートがどう繋がっているかを図で見れる画面）なんだけど、「見た目で繋がりを把握する」タイプじゃない人にはあまり刺さらないかも。

**② 継続的なメンテナンスが苦手な人**

記事を読んだら「Obsidianに追加→Claudeに統合させる」という習慣が必要。データを入れ続けないと、Wikiは枯れていく。一回作っておしまい、じゃないんです。

**③ ストレージが気になる人**

Markdownファイルが増えていくのでデバイスの容量を使う。画像もローカルに落とす設定にするとさらに増える。（Obsidian設定→Files and links→Attachment folder pathで管理できる）

■ まとめると、このシステムは「頭の外付けハードディスク」

![画像](https://pbs.twimg.com/media/HG4K1YsaYAA2f6k?format=jpg&name=large)

人間の記憶には限界がある。

アイデアを忘れる、読んだ記事を忘れる、点と点を繋げられない、一度に追える量に限りがある。

Claude Code + Obsidianでやってることは、その限界を外付けに逃がすことなんです。

考えたことが繋がって、ノートがノートに言及して、全部を横断して「わたしは何を考えていて、何を知っていて、次に何をすべきか」をClaude Codeに聞ける状態になる。

しかも、Obsidianに1つ情報を入れるたびに賢くなり続ける。

「AI第二の脳」って、ただの比喩じゃなかった。

![画像](https://pbs.twimg.com/media/HG43Z-9a8AAnl8y?format=jpg&name=large)

ーーーーーーーーーーーーーーーーーーーーーー

この記事が少しでも参考になった方へ。

すみか[＠ClaudeCode](https://x.com/%EF%BC%A0ClaudeCode)ガチ勢 （[@sumika45379](https://x.com/@sumika45379)）は、 文系の完全非エンジニアからバイブコーディングで開発できるようになった文系の自分が運営しているアカウントです！！

![画像](https://pbs.twimg.com/media/HG43o4ObYAAOhpO?format=png&name=large)

ClaudeCodeの最新情報や開発系のTipsをわかりやすく解説することを心がけています💖

現在はClaudeCodeだけでWebアプリを作って世界に公開するところまで到達✨

「コードが書けない」というコンプレックスから、 「ClaudeCodeと一緒なら何でも作れる」という確信に変わるまでの全プロセスを つまずきも含めてそのまま発信しています😻

ご関心のある方は、ぜひフォローしてチェックしてみてください👀

これからも「わたしにもできるかも」って初心者にも優しい投稿をしていきます！