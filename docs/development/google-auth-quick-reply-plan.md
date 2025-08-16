## Google認証URLをクイックリプライ（URIアクション）で送る実行計画

### 目的
- **目的**: メッセージングプラットフォーム（例: LINE）のクイックリプライのURIアクションで、Google OAuth 2.0 認証URLをユーザーに提示し、認証完了後にユーザーアカウントと連携する。

### 対象/前提
- **プラットフォーム**: LINE想定（他プラットフォームでも同等の「Quick Reply + URI Action」があれば置換可能）
- **認証方式**: Google OAuth 2.0（Authorization Code + PKCE 推奨）
- **想定フロー**: Botが「ログイン」などのトリガーでクイックリプライを返し、ユーザーがURIをタップ → ブラウザでGoogleログイン → サーバーのコールバックでトークン交換 → 連携完了

### 全体アーキテクチャ / データフロー
1. ユーザー → Bot: 「ログイン」等のトリガー
2. サーバー: 認可リクエスト生成（`state`、`code_verifier`/`code_challenge` 発行・保存）
3. Bot → ユーザー: クイックリプライ（URIアクション）で自社の開始URL（/auth/google/start）を提示
4. ユーザー → ブラウザ: /auth/google/start へアクセス（即時 Google 認可エンドポイントへ 302 リダイレクト）
5. Google → ユーザー: 認証/同意画面 → 承認
6. Google → サーバー: リダイレクト（/auth/google/callback?code=...&state=...）
7. サーバー: `state` 検証、`code_verifier` でトークン交換、IDトークン検証、ユーザーと連携
8. サーバー → ユーザー: 完了画面表示（ブラウザ）。並行して Bot で完了メッセージを Push/Reply

### 実装タスク
- **Google Cloud 設定**
  - OAuth 同意画面の設定（アプリ名、サポートメール、スコープ）
  - 認証情報: OAuth クライアントID（Webアプリ）作成
  - 承認済みリダイレクトURI: `https://<domain>/auth/google/callback`
- **環境変数定義**
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_OAUTH_SCOPES`（例: `openid email profile`）
  - `OAUTH_STATE_TTL_SECONDS`（例: 600）、`SESSION_SECRET`、`APP_BASE_URL`
- **サーバー: 認可URL生成（/auth/google/start）**
  - `state`（CSRF・多要素識別）と `code_verifier` を生成
  - `code_challenge`（S256）に変換
  - `channelUserId`（例: LINEのuserId）など、紐づけに必要な情報を `state` に暗号化内包、もしくはサーバー側ストレージに保存
  - Google 認可エンドポイントへ 302 リダイレクト
- **Bot: クイックリプライ送信**
  - URIに `/auth/google/start` を指定（直接Googleの長いURLを使わず、自社短縮URLで安定化）
  - ラベルは短く明瞭（例: 「Googleでログイン」）
- **コールバックハンドラ（/auth/google/callback）**
  - `state` 検証（存在、未使用、期限内、一致）
  - `code_verifier` 付きでトークンエンドポイントに交換
  - IDトークンの署名/`aud`/`iss`/`exp` 検証、Email確認
  - アプリ内ユーザーとリンク、初回なら作成
  - リフレッシュトークン保管（暗号化 at-rest）
- **完了処理**
  - ブラウザ: サクセス/エラーの簡易画面
  - Bot: 認証完了のPush/Reply（必要に応じて機能ガイドを送付）
- **セキュリティ**
  - PKCE必須、`state` ランダム・一意・短寿命、再利用防止
  - HTTPS 強制、機微ログのマスキング、トークン暗号化保管
  - スコープ最小化、CSP/同一サイト属性、リダイレクトオープンリダイレクタ対策
- **監視/運用**
  - 認可開始/成功/失敗のメトリクス
  - エラー率・トークンリフレッシュ失敗のアラート
  - 監査ログ（userId, scope, issued_at など最低限）
- **QA/テスト**
  - 正常系（新規/既存ユーザー、モバイル/PC）
  - エラー系（キャンセル、`state` 不一致、期限切れ、PKCE不一致）
  - リトライ/冪等性、URL有効期限、長URL・改行の扱い

### エンドポイント仕様（例）
- **GET `/auth/google/start`**
  - 入力: クッキー or クエリで `channelUserId`（無くても可。`state` 紐付けで代替）
  - 動作: `state`/`code_verifier` 生成→保存→Google 認可URL へ 302 リダイレクト
  - 保存: `state`, `code_verifier`, `channelUserId`, `expiresAt`
- **GET `/auth/google/callback`**
  - 入力: `code`, `state`
  - 動作: `state` 検証→トークン交換（PKCE）→IDトークン検証→ユーザーリンク→完了画面
  - 失敗時: エラー画面と再試行導線

### クイックリプライ（LINE例）
```json
{
  "type": "text",
  "text": "ログイン方法を選んでください",
  "quickReply": {
    "items": [
      {
        "type": "action",
        "action": {
          "type": "uri",
          "label": "Googleでログイン",
          "uri": "https://<domain>/auth/google/start"
        }
      }
    ]
  }
}
```

### データモデル（最小）
- **oauth_states**: `state`, `code_verifier_hash`, `channelUserId`, `expiresAt`, `usedAt`
- **users**: `id`, `channelUserId`, `email`, `googleSub`, `name`, `avatarUrl`
- **user_credentials**: `userId`, `provider`(google), `accessToken_enc`, `refreshToken_enc`, `scope`, `expiresAt`

### 環境変数例
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://<domain>/auth/google/callback`
- `GOOGLE_OAUTH_SCOPES=openid email profile`
- `APP_BASE_URL=https://<domain>`
- `SESSION_SECRET=...`
- `OAUTH_STATE_TTL_SECONDS=600`

### エッジケース / フォールバック
- LINE内ブラウザでの挙動不一致時は、外部ブラウザへ遷移案内
- 同時多重タップ: `state` 再利用防止・使用済み扱い
- `refresh_token` 非付与時の対応（再同意フロー導線）
- 既存アカウントに別のGoogleを紐付ける重複防止

### 作業見積（目安）
- Google設定/環境整備: 0.5d
- サーバー（start/callback, PKCE, 状態管理）: 1.5d
- Bot送信実装/文言/QA: 0.5d
- 監視/ログ/ドキュメント: 0.5d
- 合計: 3.0d 前後（既存基盤流用度合いで前後）

### 完了の定義（DoD）
- 本番相当環境で、クイックリプライからGoogleログインが成功してユーザーと連携
- 主要エラーケースでユーザーに明確な再試行導線
- セキュリティ要件（PKCE/`state`/HTTPS/暗号化保管）を満たす
- メトリクス/ログにより成功率と失敗理由が可視化