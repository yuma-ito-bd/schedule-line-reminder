# PR にテストカバレッジをコメントし、Markdown を docs/development に出力する実行計画（実装版）

## 目的
- プルリクエスト上に最新のテストカバレッジ結果を自動コメントする（`k1LoW/octocov-action` を利用）
- CI 実行時にジョブサマリ（Markdown）を `docs/development/coverage_latest.md` に出力する

## 前提
- テスト実行は Bun（`bun test`）を用いる
- 既存の `ci.yaml` を修正して対応する
- 自作スクリプトは作成しない

## ハイレベルな流れ
1. GitHub Actions で PR/Push 時に Bun をセットアップ
2. `bun install --frozen-lockfile`
3. `bun run test`（`--coverage --coverage-reporter=lcov` 付与済み）で lcov を生成（`coverage/lcov.info`）
4. `k1LoW/octocov-action` を実行して PR にカバレッジコメントを投稿
5. `GITHUB_STEP_SUMMARY` を `docs/development/coverage_latest.md` に保存
   - 生成は CI 上のみ（コミット/手動アップロードは行わない）
6. カバレッジ成果物の手動アーティファクトアップロードは行わない
   - `octocov` の `diff`/`report` のためのアーティファクト保存は `octocov` 側で実施

## 実装詳細

### 1) Bun のテストスクリプト
`package.json` の `scripts.test` を lcov 出力に対応:

```json
{
  "scripts": {
    "test": "bun test __tests__ --coverage --coverage-reporter=lcov"
  }
}
```

### 2) GitHub Actions（既存 `ci.yaml` の修正）
- 権限付与（PR コメント用）
- 依存関係インストール → `bun run test` 実行
- `octocov-action` 実行
- ジョブサマリを `docs/development/coverage_latest.md` へ保存
- カバレッジ成果物の手動アップロードは削除

例（該当箇所の要点）:

```yaml
permissions:
  contents: read
  pull-requests: write

# ...
- name: Install dependencies
  run: bun install --frozen-lockfile

- name: Run tests (with lcov coverage)
  run: bun run test

- name: Run octocov
  uses: k1LoW/octocov-action@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Save markdown coverage summary
  if: always()
  run: |
    mkdir -p docs/development
    if [ -n "${GITHUB_STEP_SUMMARY}" ] && [ -f "${GITHUB_STEP_SUMMARY}" ]; then
      cp "${GITHUB_STEP_SUMMARY}" docs/development/coverage_latest.md
    else
      echo "(No summary available)" > docs/development/coverage_latest.md
    fi
```

### 3) octocov 設定（`.octocov.yml`）
- lcov を入力に指定
- PR コメントを有効化
- `diff` のデータストアをアーティファクトに設定（`octocov` が内部で扱う）
- 既定ブランチでのレポート保存を有効化

```yaml
coverage:
  paths:
    - coverage/lcov.info
codeToTestRatio:
  code:
    - 'src/**/*.ts'
  test:
    - '__tests__/**/*.ts'
diff:
  datastores:
    - artifact://${GITHUB_REPOSITORY}
comment:
  if: is_pull_request
report:
  if: is_default_branch
  datastores:
    - artifact://${GITHUB_REPOSITORY}
```

## 運用メモ
- PR 作成/更新時に `octocov` が自動でコメントを更新（sticky）
- `docs/development/coverage_latest.md` は CI 実行ごとに生成（コミットは行わない）
- 追加の手動アーティファクトアップロードは不要

## ロールバック
- `ci.yaml` の `octocov` ステップと `Save markdown coverage summary` ステップを削除
- `.octocov.yml` を削除
- `package.json` の `test` スクリプトを元に戻す

## 今後の拡張
- 最低カバレッジのしきい値設定（未達時に CI 失敗）
- ファイル別低カバレッジのハイライト
- レポートの自動公開（GitHub Pages 等）