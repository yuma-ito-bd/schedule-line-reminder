## Google認証URLをクイックリプライ（URIアクション）で送る：最小変更の実行計画

### 背景 / 目的
- 現状は「テキストでGoogle認証URLを返信」。UX向上のため、クイックリプライ（URIアクション）で提示する。
- 最小変更で移行する（フィーチャーフラグは使用しない）。

### 変更方針（最小）
- 認証未連携ユーザーに対する返信のみ変更。
- これまで送っていたURLテキストを、クイックリプライのURIアクションへ置き換える。
- URLの生成は既存の `generateAuthUrl()` を利用し、`state` は従来通り保存する。

### 対象コード
- `src/usecases/line-webhook-usecase.ts`
  - メソッド: `handleCalendarAdd(userId: string, replyToken: string)`
  - 変更箇所: トークン未取得時（`if (!token)` ブロック）

### 実装要点
1. 認証URLの生成
   - `const { url, state } = this.googleAuth.generateAuthUrl();`
   - `await this.stateRepository.saveState(state, userId);`
2. クイックリプライで返信
   - `this.lineClient.replyTextWithQuickReply(replyToken, MessageTemplates.sendAuthGuidance, [{ type: "action", action: { type: "uri", label: "Googleでログイン", uri: url } }])`
3. 既存のカレンダー追加フローやコールバックは変更なし

### 参考：送信されるメッセージ（LINE Quick Reply 例）
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
          "uri": "<generateAuthUrl() の url>"
        }
      }
    ]
  }
}
```

### セキュリティ / 留意点
- `state` を必ず保存し、コールバックで検証。
- HTTPS を前提、ログには機微情報を出力しない。

### 動作確認
- 認証未連携ユーザーに「カレンダー追加」を送信し、クイックリプライのボタンから `generateAuthUrl()` のURLへ遷移できること。
- コールバックで `state` が一致し、連携完了後の通常フローが動作すること。

### 完了の定義（DoD）
- 本番相当環境でクイックリプライ経由のログインが成功する。
- 主要端末（iOS/Android）で表示・遷移が正常。