# Codex 引き継ぎ資料 — 教育のパタン・ランゲージ Wiki

生成日: 2026-05-09

---

## 1. ディレクトリ構造

```
content/                          (604 files total)
├── index.md
├── log.md
├── 【完全版】Claude Code + Obsidianで…1.md
├── パタン/                        539 .md files — パタン・ランゲージ本体
├── メタパタン/                     6 .md files  — パタン群の上位概念
├── 概念/                          27 .md files  — 用語・概念定義
├── 学級経営/                       1 .md file
├── 教科/                          4 .md files   — 教科別ハブ
├── 実践/                          3 .md files   — 実践事例
├── 特別支援/                       4 .md files
└── 文献/                          17 .md files  — 文献・動画記録
```

### 各ディレクトリのファイル数

| ディレクトリ | ファイル数 |
|---|---|
| content/パタン | 539 |
| content/概念 | 27 |
| content/文献 | 17 |
| content/メタパタン | 6 |
| content/特別支援 | 4 |
| content/教科 | 4 |
| content/実践 | 3 |
| content/（ルート） | 3 |
| content/学級経営 | 1 |
| **合計** | **604** |

---

## 2. Frontmatter 集計

### 2-1. キー一覧（出現ファイル数順）

| キー | 出現ファイル数 |
|---|---|
| tags | 601 |
| type | 600 |
| updated | 594 |
| related | 99 |
| source | 45 |
| sources | 29 |
| title | 10 |
| subject | 10 |
| class | 8 |
| author | 7 |
| year | 6 |
| ingested | 6 |
| video | 4 |
| published | 1 |
| created | 1 |
| description | 1 |

### 2-2. `type` フィールドの値ごとのファイル数

| type 値 | ファイル数 |
|---|---|
| pattern | 537 |
| concept | 29 |
| practice | 8 |
| literature | 6 |
| meta-pattern | 6 |
| reference | 5 |
| video-note | 4 |
| 動画記録 | 2 |
| subject-hub | 2 |
| note | 1 |

> **注意:** `動画記録` は日本語値。他の `video-note` と統一することを推奨。

---

## 3. 現在の Quartz 設定

```typescript
// quartz.config.ts
import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "Quartz 4",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "unknownthings-ed-patterns.github.io/unknownthings-ed-patterns",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#faf8f8",
          lightgray: "#e5e5e5",
          gray: "#b8b8b8",
          darkgray: "#4e4e4e",
          dark: "#2b2b2b",
          secondary: "#284b63",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#fff23688",
        },
        darkMode: {
          light: "#161618",
          lightgray: "#393639",
          gray: "#646464",
          darkgray: "#d4d4d4",
          dark: "#ebebec",
          secondary: "#7b97aa",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#b3aa0288",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: { light: "github-light", dark: "github-dark" },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({ enableSiteMap: true, enableRSS: true }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
```

---

## 4. Lint 結果

### 4-1. TypeScript 型チェック（`tsc --noEmit`）

**エラー: 0件** — 型エラーなし。

### 4-2. Frontmatter 必須キー欠損チェック

#### frontmatter ブロック自体が存在しないファイル（2件）

| ファイル | 備考 |
|---|---|
| `log.md` | 作業ログファイル、パタンではない |
| `パタン/パタンは、フッサールの言う本質と言えるのだろうか。.md` | 要 frontmatter 追加 |

#### `type` キー欠損（2件）

| ファイル | 備考 |
|---|---|
| `index.md` | サイトトップページ、意図的に省略可 |
| `【完全版】Claude Code + Obsidianで「AI第二の脳」を「たった5分」で作る方法 1.md` | 外部記事コピー、要対応または削除 |

#### `tags` キー欠損（1件）

| ファイル | 備考 |
|---|---|
| `index.md` | サイトトップページ、意図的に省略可 |

#### `type` 値の表記ゆれ（要統一）

| 現在の値 | 推奨値 | 件数 |
|---|---|---|
| `動画記録` | `video-note` | 2 |

### 4-3. 壊れた Wikiリンク（リンク先ファイル未存在）

**合計: 98件**（39ファイルが含むリンク）

主な原因パターン：

| 原因 | 代表例 |
|---|---|
| ARCSモデルのサブパタン（A1〜S3）がリンクされているが単独ファイルとして存在しない | `パタン/A1.興味の獲得（知覚的喚起）` など12件 |
| ファイル名変更後にリンクが未更新 | `パタン/制限化`、`パタン/熟慮的安全性`、`パタン/コレクション`、`パタン/ポートフォリオ` など |
| `外部と内部の視点を取り入れる`（正: `内部と外部それぞれの視点を取り入れる`） | 1件 |
| `パタン/予測`（正: `パタン/予測（インストラクション）`） | 1件 |
| `パタン/失敗`（正: `パタン/失敗（インストラクション）` 等） | 1件 |
| `index.md` 内の `メタパタン/`・`パタン/` フォルダリンク（Quartzでは未解決） | 多数 |

**優先対応推奨:**
1. ARCSモデルのサブパタンファイルを新規作成するか、リンクをまとめページへ変更
2. ファイル名変更によるリンク切れを修正（`制限化` → 正しいファイル名を確認して更新）

---

## 5. 同期・デプロイ構成

| 項目 | 内容 |
|---|---|
| Obsidian vault | `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/教育のパタン・ランゲージ/wiki/` |
| Quartz content | `~/quartz/content/` |
| 同期スクリプト | `~/quartz/sync-obsidian.sh`（rsync + git commit + push） |
| launchd 自動同期 | `~/Library/LaunchAgents/` に plist 設置済み |
| GitHub リポジトリ | `unknownthings-ed-patterns/unknownthings-ed-patterns`、ブランチ `v4` |
| デプロイ | GitHub Actions → GitHub Pages |

---

## 6. パタンファイルの標準構造

```markdown
---
type: pattern
tags: [パタン, <カテゴリ>, ...]
updated: YYYY-MM-DD
---

# パタン名

> 引用文（1行）

## 背景（Context）
## 問題（Problem）
## 力のかたち（Forces）
## 解決（Solution）
## 結果（Consequences）
## 関連パタン
## Actionable Insight   ← 3つの具体的アクション箇条書き
## 出典
```

全 537 パタンファイルに `## Actionable Insight` セクション追加済み（2026-05-09 完了）。
