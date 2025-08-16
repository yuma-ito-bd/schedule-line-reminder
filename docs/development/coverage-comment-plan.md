# PR にテストカバレッジをコメントし、Markdown を docs/development に出力する実行計画

## 目的
- プルリクエスト上に最新のテストカバレッジ結果を自動コメントする
- 併せて、同等のレポートを `docs/development` 配下に Markdown で生成・保存する

## 前提
- テスト実行は Bun を用いる（`bun test --coverage`）
- ワークフローは既存の `ci.yaml` に依存せず、新規で `coverage-comment.yaml` を追加
- リポジトリ内に `docs/development` ディレクトリが存在

## ハイレベルな流れ
1. GitHub Actions で PR/Push 時に Bun をセットアップ
2. `bun install --frozen-lockfile`
3. `bun test --coverage` を実行し、カバレッジ成果物を収集
4. 生成されたカバレッジを Markdown に変換
5. 変換結果を
   - PR にコメント（スレッドを固定/上書き）
   - `docs/development/coverage_latest.md` として出力
6. カバレッジ関連ファイルはアーティファクトにも保存

## 実装詳細

### 1) カバレッジ成果物
- Bun のカバレッジ出力（標準出力）に加え、以下のいずれかを採用
  - A. Bun のレポーター（`lcov` や `json-summary`）が利用可能な場合
    - 例: `bun test --coverage --coverage-reporter=lcov --coverage-reporter=json-summary`
    - 生成物: `coverage/lcov.info`, `coverage/coverage-summary.json`
  - B. 上記が利用不可の場合
    - 一時的に標準出力のサマリをパースして Markdown へ整形する自作スクリプトを使用

本計画では A を第一候補とし、B をフォールバックとする。

### 2) Markdown 生成スクリプト
- 追加ファイル（例）: `scripts/coverage_to_md.mjs`
- 入力: `coverage/coverage-summary.json`（A 案）
- 出力: `docs/development/coverage_latest.md`
- 出力例:
  - 見出し（実行日時・コミット SHA）
  - 全体サマリ（Statements, Branches, Functions, Lines の % と Covered/Total）
  - ファイル別テーブル（必要に応じて）

### 3) PR へのコメント
- `marocchino/sticky-pull-request-comment@v2` を使用
  - `with: { recreate: true, path: docs/development/coverage_latest.md }`
  - 既存コメントを同一スレッドで上書き
- 代替案: `peter-evans/create-or-update-comment`（find → create/update）

### 4) 生成物の扱い
- `docs/development/coverage_latest.md` は CI 実行時に生成
  - オプション1（推奨）: 生成のみ。成果物としてアップロード
  - オプション2（社内 PR 限定）: `stefanzweifel/git-auto-commit-action` で PR ブランチへコミット
    - メリット: PR 差分にレポートが含まれる
    - デメリット: 外部コントリビューションでは制約あり／再実行ごとにコミット増加

### 5) 権限
- ワークフロー冒頭で最低限の権限を明示
```
permissions:
  contents: read
  pull-requests: write
```

## 追加するワークフロー例（ドラフト）
`.github/workflows/coverage-comment.yaml` を新規追加:

```yaml
name: Coverage Comment

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read
  pull-requests: write

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: ".tool-versions"

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run tests with coverage
        run: |
          bun test --coverage \
            --coverage-reporter=lcov \
            --coverage-reporter=json-summary || true

      - name: Show coverage files (debug)
        run: |
          ls -la
          [ -d coverage ] && ls -la coverage || true

      - name: Generate coverage markdown
        run: |
          node scripts/coverage_to_md.mjs \
            coverage/coverage-summary.json \
            docs/development/coverage_latest.md

      - name: Upload coverage artifact
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: |
            coverage/**
            docs/development/coverage_latest.md

      - name: Comment coverage on PR
        if: ${{ github.event_name == 'pull_request' }}
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          recreate: true
          path: docs/development/coverage_latest.md
```

> メモ: Bun の `--coverage-reporter` オプションが利用不可の場合は、`Run tests with coverage` ステップを `bun test --coverage | tee coverage_raw.txt` に変更し、`coverage_raw.txt` をパースする版の `coverage_to_md.mjs` を用意する。

## 作業手順
1. `scripts/coverage_to_md.mjs` を追加
2. `.github/workflows/coverage-comment.yaml` を追加
3. 必要に応じて CI での Node 実行環境（`node` コマンド）をインストール（Ubuntu ランナーには同梱）
4. PR を作成して動作確認
   - PR に「Coverage Comment」が付与されること
   - アーティファクトに `lcov.info` / `coverage-summary.json` / `coverage_latest.md` が含まれること

## ロールバック戦略
- 新規ワークフローを削除するだけで元の状態に戻せる
- 既存 `ci.yaml` には非干渉

## 今後の拡張
- しきい値（最低カバレッジ %）を設け、未達時に失敗させる
- ファイル別の低カバレッジ検出とハイライト
- バッジ（README）向けの値を自動更新