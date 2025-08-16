## Google認証URL: テキスト送信 → クイックリプライ（URIアクション）移行計画

### 背景 / 現状
- 現在は、Botがユーザーへ「Googleログイン用のURLテキスト」を送信している。
- 目的は、テキストURLを「クイックリプライ（URIアクション）」に置き換え、タップ動線を明確化しUXを向上すること。

### 目的 / ゴール
- テキストURLの直接送付を廃止（またはフォールバック化）し、クイックリプライで `/auth/google/start` を提示する。
- 認証成功率・タップ率の向上、誤タップ/誤コピーの削減。

### 影響範囲
- 送信メッセージ生成レイヤ（Bot → ユーザー）。
- サーバー側の認可フロー（/auth/google/start, /auth/google/callback）は基本的に変更不要。ただし `state` 管理やドメイン/HTTPSは前提として維持。

### 要件
- 機能要件
  - ユーザーに「Googleでログイン」ボタン（URIアクション）をクイックリプライで提示。
  - URIは自社の開始エンドポイント（例: `https://<domain>/auth/google/start`）。
  - 開始エンドポイントは `state` と `code_verifier`（PKCE）を生成し、Googleの認可URLへ 302 リダイレクト。
- 非機能要件
  - HTTPS 必須、短縮/安定したURI。
  - ログ/メトリクスで開始/成功/失敗が可視化可能。
  - プラットフォーム制限（項目数/ラベル長/URI長）に準拠。
- 互換/フォールバック
  - クイックリプライ非対応クライアント向けの簡易テキスト案内を保持（必要に応じて同梱）。

### 仕様（メッセージ / エンドポイント）
- メッセージ仕様（LINE想定）
  - `type: text` に `quickReply.items[0].action` として `type: uri` を付与。
  - ラベルは簡潔（例: 「Googleでログイン」）。
- エンドポイント
  - `GET /auth/google/start`: `state` と `code_verifier` を生成→保存→Google認可エンドポイントへ 302。
  - `GET /auth/google/callback`: `state` 検証→`code_verifier` でトークン交換→IDトークン検証→ユーザー連携→完了画面。

### 実装手順
1. フィーチャーフラグ導入
   - `FEATURE_GOOGLE_LOGIN_QUICK_REPLY`（bool）で、テキスト送信/クイックリプライの切替を可能にする。
2. メッセージ組立の抽象化
   - 既存の「テキストURL送信」ロジックを関数化（例: `buildGoogleLoginMessage()`）。
   - 引数に `useQuickReply` を取り、Quick Reply とテキストの双方を生成できるようにする。
3. クイックリプライ生成処理の実装
   - Quick Reply のURIアクションで `/auth/google/start` を指定。
   - ラベルとテキスト本文（誘導文）を定義。
4. 呼び出し箇所の置換
   - 「ログイン」導線やアカウント連携導線で `buildGoogleLoginMessage(useQuickReply = FEATURE_GOOGLE_LOGIN_QUICK_REPLY)` を使用。
5. エラーハンドリング/リトライ
   - 送信失敗時の再送、クイックリプライ送信不可時のフォールバック（テキスト）。
6. ログ/メトリクス
   - 送信種別（text/quick_reply）、タップ推定（開始アクセス）を計測。
7. 検証とロールアウト
   - ステージングで動作確認 → カナリア（一部ユーザー）→ 全量切替。

### メッセージ例（LINE Quick Reply）
```json
{
  "type": "text",
  "text": "Googleアカウントでログインしてください",
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

### フォールバック例（必要な場合）
```json
{
  "type": "text",
  "text": "Googleでログイン: https://<domain>/auth/google/start"
}
```

### セキュリティ / プライバシー
- PKCE 必須、`state` は一意・短寿命・再利用不可。
- トークンは暗号化保管、機微情報はログ出力しない。
- HTTPS 強制、オープンリダイレクト対策（固定化/ホワイトリスト）。

### ログ / メトリクス（例）
- `auth_quick_reply_sent`（count）
- `auth_start_accessed`（count, by client/os）
- `auth_success` / `auth_failure`（count, reason）
- `callback_state_invalid` / `token_exchange_error`（count）

### テスト観点
- 正常系
  - クイックリプライ表示、URIタップで `/auth/google/start` に遷移し、Google同意→連携完了。
- エラー系
  - `state` 不一致/期限切れ、PKCE不整合、キャンセル時の再試行導線。
- 互換
  - クイックリプライ非対応クライアントでのフォールバック表示。
- 端末/環境
  - iOS/Android/外部ブラウザ遷移、アプリ内ブラウザでのCookie動作確認。

### ロールアウト計画
- ステージング検証 → 社内ドッグフーディング → パーセンテージカナリア → 全量。
- ロールバック手順: フィーチャーフラグOFFで即時テキスト送信に復帰。

### 工数目安
- 実装（メッセージ生成/切替/ログ）: 0.5–1.0d
- 検証/QA: 0.5d
- ロールアウト/監視: 0.5d

### 完了条件（DoD）
- 本番でクイックリプライ経由のログインが成功し、主要端末で動作確認済み。
- 失敗時の再試行導線がユーザーに提示される。
- メトリクスで開始→成功のファネルが可視化される。
- フィーチャーフラグで即時ロールバック可能。