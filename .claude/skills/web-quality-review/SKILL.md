---
name: web-quality-review
description: Web/TypeScriptプロジェクトをセキュリティ・パフォーマンス・可読性の3観点でレビューしながら実装を進める。Analyzer→Builder→Reviewerのループでブロッキング指摘を0件になるまで修正する。「3観点でレビューしながら実装して」「セキュリティとパフォーマンスを重視してレビューして」などと言われたときに使用する。
argument-hint: "[filepath_or_dir]"
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(date *), Bash(mkdir *), Bash(npx tsc *), Bash(npm run build *)
---

## 引数
- `$ARGUMENTS[0]`: 対象ファイルパス、またはディレクトリパス

---

## 概要

このスキルは **3つの品質観点** でコードをレビューしながら実装を進める。

| 観点 | 主な確認内容 |
|------|------------|
| **セキュリティ** | XSS対策・入力バリデーション・URLサニタイズ・CSP |
| **パフォーマンス** | 遅延読み込み・バンドルサイズ・アニメーション最適化 |
| **可読性** | TypeScript型定義・単一責任・命名規則 |

---

## ステップ 0：前処理

### 0-1. 対象ファイルリストの作成

`$ARGUMENTS[0]` を確認する。

- **ファイルの場合**: そのファイル1つを対象に設定
- **ディレクトリの場合**: `.ts`, `.js`, `.html`, `.css` を再帰的に収集
- **未指定・存在しない場合**:
  ```
  エラー: 対象ファイル/ディレクトリが見つかりません。
  例: /web-quality-review ./src/
  例: /web-quality-review ./src/main.ts
  ```

### 0-2. レポートファイルの準備

```
~/.claude/reports/web-quality-review_[YYYYMMDD_HHMMSS].md
```

`date +%Y%m%d_%H%M%S` で日時を取得してファイルを作成する。

冒頭に記載:
```markdown
# web-quality-review レポート

- 実行日時: [日時]
- 対象: [パス]
- ファイル数: [件数]

---
```

---

## ステップ 1〜3：各ファイルへの実行

ファイルごとに以下のフェーズ1〜3を順番に実行する。

---

### フェーズ 1：Analyzer（3観点分析）

対象ファイルを読み込み、3観点それぞれで課題を洗い出す。

#### 出力フォーマット

```
## [Analyzer] 分析レポート - {ファイルパス}

### 構造サマリー
（ファイルの概要・役割）

### 観点1：セキュリティ
| 重要度 | 課題 |
|--------|------|
| 高     | ... |
| 中     | ... |

### 観点2：パフォーマンス
| 重要度 | 課題 |
|--------|------|
| 高     | ... |
| 中     | ... |

### 観点3：可読性
| 重要度 | 課題 |
|--------|------|
| 高     | ... |
| 中     | ... |

### 改善要件リスト（優先順）
- [ ] ...（重要度高から順に）

### Builderへの引き継ぎ
（注意点・前提条件）
```

---

### フェーズ 2：Builder（実装・修正）

Analyzerの課題を重要度「高」から順に修正する。

#### セキュリティ修正の手順

1. **XSS対策の確認・追加**
   - `innerHTML` / `insertAdjacentHTML` への挿入前にエスケープ関数を適用
   - エスケープ関数の実装例:
     ```typescript
     function escapeHtml(raw: string): string {
       return raw
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
     }
     ```

2. **URLサニタイズの追加**
   - `href` / `src` にユーザーデータを使う場合は `javascript:` スキームをブロック:
     ```typescript
     const SAFE_URL = /^https?:\/\//i;
     function sanitizeUrl(url: string): string {
       return SAFE_URL.test(url) ? url : "#";
     }
     ```

3. **Content Security Policy の追加（HTMLファイルの場合）**
   ```html
   <meta http-equiv="Content-Security-Policy"
         content="default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; object-src 'none'"/>
   ```

4. **入力バリデーションの確認**
   - フォーム・クエリパラメータ・外部データの境界でバリデーションを実施
   - 型ガード関数を作成して型安全なバリデーションを実現

#### パフォーマンス修正の手順

1. **画像の遅延読み込み**
   ```html
   <img loading="lazy" decoding="async" width="W" height="H" .../>
   ```
   - `width`/`height` の明示でCLS（レイアウトシフト）を防止

2. **アニメーションのCSSクラス化**
   - インラインstyle操作（`element.style.opacity`）を避ける
   - CSSクラスの追加/削除で制御:
     ```css
     .card { opacity: 0; transform: translateY(16px); transition: opacity 0.35s, transform 0.35s; }
     .card--visible { opacity: 1; transform: translateY(0); }
     ```
   - ダブル `requestAnimationFrame` でリフロー後に確実に適用:
     ```typescript
     requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("visible")));
     ```

3. **アクセシビリティ対応のアニメーション無効化**
   ```css
   @media (prefers-reduced-motion: reduce) {
     .card { transition: none; opacity: 1; transform: none; }
   }
   ```

4. **バンドルサイズの確認**
   - 外部依存ライブラリは必要最小限に抑える
   - Tree-shakingを有効にしたビルド設定を確認

#### 可読性修正の手順

1. **TypeScript型定義の追加**
   - `types.ts` を分離してインターフェース・ユニオン型を定義
   - `strict: true` / `noImplicitAny: true` / `strictNullChecks: true` を有効化
   - `readonly` 修飾子でデータの不変性を示す

2. **単一責任への分割**
   - 1関数が複数のDOM要素を操作している場合は分割する
   - 分割の目安: 関数が「~を取得しかつ~を更新しかつ~を表示する」なら分割対象
   - 命名規則:
     - `build*Html()` — HTML文字列の生成
     - `populate*()` — DOM要素への値の書き込み
     - `attach*Listeners()` — イベントリスナーのアタッチ
     - `init*()` — 初期化処理
     - `render*()` — レンダリング全体のオーケストレーション

3. **汎用ヘルパーの作成**
   ```typescript
   function getEl<T extends HTMLElement>(id: string): T {
     const el = document.getElementById(id) as T | null;
     if (!el) throw new Error(`#${id} not found`);
     return el;
   }
   ```

4. **モーダルのアクセシビリティ**
   - フォーカストラップの実装（`Tab`/`Shift+Tab` でモーダル内に閉じ込める）
   - `hidden` + `aria-hidden` の二重制御
   - 閉じる際の `removeEventListener` を忘れずに

#### 出力フォーマット

```
## [Builder] 実装レポート - {ファイルパス}

### 実施した変更
| ファイル | 変更内容 | 対応観点 |
|---------|---------|--------|
| ...     | ...     | セキュリティ |

### 実装メモ
（設計上の判断理由）

### 未対応項目
（対応しなかった理由）

### Reviewerへの確認ポイント
（特にチェックしてほしい箇所）
```

---

### フェーズ 3：Reviewer（3観点検証）

Builderの修正後ファイルを読み込み、各観点でスコアリングする。**ファイルの変更は行わない。**

#### セキュリティ チェックリスト

- [ ] `innerHTML` 挿入前に `escapeHtml` を適用しているか
- [ ] `href`/`src` にユーザーデータを使う場合 `sanitizeUrl` を通しているか
- [ ] `javascript:` スキームのURLが流入できないか
- [ ] Content Security Policy が設定されているか（HTMLの場合）
- [ ] 機密情報（APIキー等）がハードコードされていないか
- [ ] 外部データの境界でバリデーションがあるか

#### パフォーマンス チェックリスト

- [ ] `<img loading="lazy" decoding="async">` が設定されているか
- [ ] `width`/`height` 属性でCLSを防止しているか
- [ ] アニメーションがCSSクラスベースで実装されているか
- [ ] `prefers-reduced-motion` に対応しているか
- [ ] 外部依存ライブラリが不要に読み込まれていないか
- [ ] バンドルサイズが合理的な範囲（目安: JS 50KB未満）か

#### 可読性 チェックリスト

- [ ] TypeScript `strict` モードが有効か
- [ ] `any` 型が使われていないか（または抑制コメントで理由が明示されているか）
- [ ] 型定義が適切なファイルに分離されているか
- [ ] 1関数が単一の責任を持っているか
- [ ] DOM取得に型安全なヘルパーを使っているか
- [ ] フォーカストラップの `addEventListener`/`removeEventListener` が対称になっているか

#### 出力フォーマット

```
## [Reviewer] 検証レポート - {ファイルパス}

### 総合評価
（合格 / 条件付き合格 / 要修正）

### 品質スコア
| 観点 | スコア | 主な根拠 |
|------|--------|---------|
| セキュリティ | ★★★★☆ | ... |
| パフォーマンス | ★★★★★ | ... |
| 可読性 | ★★★★☆ | ... |

### 指摘事項
#### 必須修正（Blocking）
- （修正しないとリリース不可な問題）

#### 推奨改善（Non-blocking）
- （あると良い改善点）

### 承認コメント
（良かった点）
```

---

### フェーズ 4：自動ループ（Blockingがある場合）

**ループ条件**: Blocking件数 > 0 かつ ループ回数 < 3回

1. Reviewerの指摘をBuilderに引き継ぐ
2. BuilderがBlocking箇所のみを修正（フェーズ2を再実行）
3. Reviewerが再レビュー（フェーズ3を再実行）
4. Blocking = 0 または3回到達で終了

ループ中の出力:
```
## [Loop N/3] 再修正サイクル - {ファイルパス}

### 対象Blocking
（前回の必須修正リスト）

### Builderの修正内容
（何をどう修正したか）

### Reviewerの再評価
（残Blocking件数）
```

3回でもBlockingが残る場合:
```
⚠️ 最大ループ（3回）到達
残Blocking: N件（手動対応が必要）
```

---

## ステップ 4：レポート保存

各ファイルのフェーズ1〜4の出力をレポートファイルに追記する。

---

## ステップ 5：最終サマリー

```
---
## [web-quality-review] 完了サマリー

実行日時: [日時]
対象: [パス]

### ファイル別結果
| ファイル | Blocking | セキュリティ | パフォーマンス | 可読性 | ループ |
|---------|---------|------------|-------------|-------|------|
| ...     | 0件      | ★★★★★      | ★★★★★       | ★★★★☆ | 0回  |

### 総合結果
- 処理ファイル数: N
- 合格: N件 / 条件付き合格: N件 / 要修正: N件

### レポート保存先
~/.claude/reports/web-quality-review_[日時].md

### 次のアクション
（残Blockingや推奨改善への対応方針）
```

---

## 全体の注意事項

- フェーズ1→2→3の順を守り、前フェーズの出力を次フェーズに引き継ぐこと
- TypeScriptのコンパイル（`npx tsc`）を各修正後に実行して型エラーがないことを確認すること
- ループはファイル単位で完結させること
- 出力は日本語で行うこと
