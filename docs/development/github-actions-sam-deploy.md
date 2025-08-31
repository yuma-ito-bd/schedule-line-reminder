# GitHub Actions で AWS SAM をデプロイする手順（bun run build_and_deploy）

このドキュメントは、本リポジトリで `bun run build_and_deploy` を GitHub Actions から実行し、AWS SAM アプリケーションをビルド・デプロイするために必要な作業をまとめたものです。

## ゴール
- GitHub Actions 上で `bun run build_and_deploy` を実行し、`template.yaml` をもとにスタックを `ap-northeast-1` へデプロイする
- 手動オペレーションなし（確認プロンプトなし）で継続的デプロイできる

## 前提（現状確認）
- `package.json` のスクリプト:
  - `build`: `sam build`
  - `deploy`: `sam deploy --profile private-admin`
  - `build_and_deploy`: `bun run build && bun run deploy`
- `samconfig.toml` の `default.deploy.parameters`:
  - `region = "ap-northeast-1"`
  - `profile = "private-admin"`
  - `confirm_changeset = false`, `resolve_s3 = true`, `s3_prefix = "schedule-line-reminder"`
- SAM テンプレート: `template.yaml`
- 既存の CI: `.github/workflows/ci.yaml`（テスト/カバレッジ）と `.github/workflows/type-check.yaml`

## 実装タスク一覧
1. GitHub Actions から AWS 認証を安全に付与する方式を決定
   - 推奨: GitHub OIDC + IAM Role（`aws-actions/configure-aws-credentials@v4`）
   - 代替: 長期アクセスキー（Secrets）
2. デプロイ用ワークフローを作成（例: `.github/workflows/deploy.yaml`）
   - bun のセットアップ
   - SAM CLI のセットアップ
   - OIDC 経由で AWS 認証（またはアクセキー使用）
   - `bun install --frozen-lockfile`
   - `bun run build_and_deploy` を実行
3. 非対話デプロイの安定化
   - `samconfig.toml` で `confirm_changeset = false` は既に設定済み
   - 変更がない場合も失敗させない: `--no-fail-on-empty-changeset` の付与を検討
   - Profile 依存の排除（Actions では明示プロファイルを使わず、環境変数/一時クレデンシャルで認証）
4. アクセス権限の整備
   - OIDC 用 IAM Role に必要ポリシー（`cloudformation`, `s3`, `lambda`, `iam:PassRole` など最小権限）
   - S3 バケット（`resolve_s3 = true` で自動作成されるが、組織ポリシーに応じて事前作成も検討）
5. トリガーの定義
   - `push` to `main`、`workflow_dispatch`（手動）、`tags` など
6. Secrets/Variables の設定
   - OIDC 方式: 基本不要（アカウントID/ロールARNはワークフローにハードコード or `env`/`vars`）
   - アクセスキー方式: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

## 推奨ワークフロー例（OIDC 推奨）

```yaml
name: Deploy (SAM)

on:
  push:
    branches: [ main ]
  workflow_dispatch: {}

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: ".tool-versions"

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Setup SAM CLI
        uses: aws-actions/setup-sam@v2

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-region: ap-northeast-1
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/${{ secrets.AWS_DEPLOY_ROLE_NAME }}

      - name: Deploy via bun
        env:
          # SAM は Actions の一時クレデンシャルを自動検出するため profile 指定は不要
          # 変更がない場合の失敗防止を明示したい場合は package.json を調整する
          NODE_OPTIONS: "--max_old_space_size=4096"
        run: bun run build_and_deploy
```

- 備考:
  - 上記は `role-to-assume` を Secrets で受け取る例です（`AWS_ACCOUNT_ID`, `AWS_DEPLOY_ROLE_NAME`）。固定であれば文字列直書きでも可。
  - `sam deploy` の `--profile` は OIDC では不要のため、`package.json` を以下のいずれかに調整することを推奨します。
    - A) OIDC 専用スクリプトを追加
      - `deploy_ci`: `sam deploy --no-fail-on-empty-changeset`
      - `build_and_deploy_ci`: `bun run build && bun run deploy_ci`
    - B) 既存 `deploy` を profile なしに変更（ローカル利用へ影響する点に注意）

## 代替ワークフロー例（アクセスキー方式）

```yaml
name: Deploy (SAM)

on:
  push:
    branches: [ main ]
  workflow_dispatch: {}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: ".tool-versions"

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Setup SAM CLI
        uses: aws-actions/setup-sam@v2

      - name: Configure AWS credentials (keys)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1

      - name: Deploy via bun
        run: bun run build_and_deploy
```

## `package.json` の調整（推奨）
- 現状: `deploy` が `--profile private-admin` を使用
- Actions から OIDC で実行する場合、`profile` 指定は不要かつ失敗要因となるため、CI 用にスクリプトを分けることを推奨

例:
```json
{
  "scripts": {
    "build": "sam build",
    "deploy": "sam deploy --profile private-admin",
    "deploy_ci": "sam deploy --no-fail-on-empty-changeset",
    "build_and_deploy": "bun run build && bun run deploy",
    "build_and_deploy_ci": "bun run build && bun run deploy_ci"
  }
}
```
- ワークフロー側では `bun run build_and_deploy_ci` を実行

## IAM / 権限の考慮
- OIDC ロールに必要な代表的権限（最小化は要調整）
  - `cloudformation:*`（少なくとも `Create/Update/Describe/Delete`）
  - `s3:*`（パッケージ/アーティファクト用。`resolve_s3 = true` を使う場合）
  - `lambda:*`, `logs:*`（関数/ログの作成・更新）
  - `iam:PassRole`（SAM が実行ロールを紐づける場合）
- 既存の組織セキュリティポリシーに合わせてスコープを最小化

## トラブルシュート
- Debian ベースの Docker で `apt-get` が "Release file is not valid yet" で失敗
  - ビルド環境の時計ずれが原因。`apt-get` に `Acquire::Check-Valid-Until false` を追加する、またはベースイメージ/ミラーを変更
- `sam deploy` がプロンプト待ち
  - `samconfig.toml` の `confirm_changeset = false` を確認、CI では `--no-fail-on-empty-changeset` の追加を検討
- Credentials/Region 関連のエラー
  - OIDC 使用時は `configure-aws-credentials` ステップが先行しているか確認、`aws-region` を `ap-northeast-1` に設定

## 確認したい点（要回答）
1. 認証方式は OIDC（推奨）で問題ありませんか？それともアクセスキー方式を希望しますか？
2. OIDC 用 IAM Role の ARN（もしくはアカウント ID とロール名）は決まっていますか？
3. デプロイトリガーは `push` to `main` と手動実行（`workflow_dispatch`）でよいですか？
4. CI 用に `build_and_deploy_ci` スクリプトを追加し、ワークフローはそれを実行する構成に変更して問題ありませんか？
5. 既存の `--profile private-admin` はローカル専用として維持でよいですか？

---
このドキュメントの内容を確定次第、ワークフローファイルの作成/更新を進めます。