# 3. LINE Bot機能拡張

## 概要
複数カレンダー管理のためのLINE Botコマンド機能を実装する。ユーザーはLINE上でカレンダーの追加・削除・一覧表示・有効無効切り替えを行えるようにする。

## タスク詳細

### 3.1 カレンダー管理コマンド実装
- **優先度**: High
- **工数**: 4-5時間
- **内容**:
  - `LineWebhookUseCase`にコマンド処理を追加
  - コマンド例:
    - `カレンダー一覧`: 購読中のカレンダーリストを表示
    - `カレンダー追加`: 利用可能なカレンダーリストを表示し、追加を促す
    - `カレンダー削除 [カレンダー名]`: 指定カレンダーを購読解除（データを削除）

### 3.2 対話式カレンダー追加フロー
- **優先度**: Medium
- **工数**: 3-4時間
- **内容**:
  - カレンダー追加時の対話式インターフェース
  - Postback Actionを使った選択式UI (もしくはクイックリプライ)
  - セッション管理（追加処理の途中状態管理）

### 3.3 エラーハンドリングとユーザーフレンドリーメッセージ
- **優先度**: Medium
- **工数**: 2時間
- **内容**:
  - カレンダーアクセス権限エラーの適切な処理
  - ユーザーにとって分かりやすいエラーメッセージ
  - ヘルプコマンドの追加

## コマンド仕様

### 基本コマンド
- **`カレンダー一覧`** または **`カレンダー`**
  - 現在購読中のカレンダー一覧を表示

- **`カレンダー追加`**
  - Google Calendarから利用可能なカレンダーリストを取得
  - ユーザーに選択肢を提示（Postback Action使用）

- **`カレンダー削除 [カレンダー名]`**
  - 指定されたカレンダーを購読解除（データを削除）
  - 確認メッセージを表示

- **`ヘルプ`** または **`help`**
  - 使用可能なコマンド一覧を表示

## 技術的考慮事項

### ユーザーインターフェース
- **LINE Messaging API**: Push/Reply API の活用
- **Rich Menu**: 頻繁に使用する機能へのクイックアクセス
- **Postback Action**: 選択式インターフェースでのユーザビリティ向上
- **Quick Reply**: 簡単な選択肢の提供

### セッション管理
- **状態管理**: 対話途中の状態をDynamoDBまたはメモリで管理
- **タイムアウト**: セッション有効期限の設定
- **エラー復旧**: セッション途中でエラーが発生した場合の処理

### エラーハンドリング
- **権限エラー**: カレンダーアクセス権限がない場合の適切な案内
- **API制限**: Google Calendar API制限に達した場合の処理
- **ネットワークエラー**: 一時的な通信エラーの適切なハンドリング

## 関連ファイル
- `src/use-cases/line-webhook-use-case.ts` - Webhook処理ロジック
- `src/adapters/line-messaging-api-adapter.ts` - LINE API アダプター
- `src/lib/session-manager.ts` - セッション管理（新規作成）
- `src/types/line-bot.d.ts` - 型定義

## 実装ToDo（段階的手順・コードレベル）

> 段階ごとにコミット可能な粒度で進められるように順序を再構成しています。

### 0. 準備（基盤拡張）
- [ ] 依存注入の拡張: `src/usecases/line-webhook-usecase.ts`
  - `constructor` に `userCalendarRepository: Schema$UserCalendarRepository` を追加し、フィールドで保持。
- [ ] 依存注入の呼び出し元: `src/handlers/line-webhook-handler.ts`
  - `UserCalendarRepository` を生成し、`LineWebhookUseCase` に渡す。
  - 変更例:
    - 既存: `new LineWebhookUseCase(lineClient, googleAuth, stateRepository, tokenRepository)`
    - 変更後: `new LineWebhookUseCase(lineClient, googleAuth, stateRepository, tokenRepository, new UserCalendarRepository())`
- [ ] イベント型の拡張: `src/types/line-webhook-event.d.ts`
  - `PostbackEvent` を追加し、`LineWebhookEvent` を `MessageEvent | UnfollowEvent | PostbackEvent` に拡張。
- [ ] Postbackペイロード型: 新規 `src/types/line-bot.d.ts`
  - `PostbackData` ユニオンと `serializePostbackData` / `parsePostbackData` を宣言。
  - 例: `ADD_CALENDAR_SELECT` / `DELETE_CALENDAR_CONFIRM` / `CANCEL`。
- [ ] LINEクライアントI/F拡張: `src/types/line-messaging-api-adapter.d.ts`
  - 追加: `replyTextWithQuickReply(...)`, `replyTemplateMessage(...)`。
- [ ] LINEクライアント実装拡張: `src/line-messaging-api-client.ts`
  - 上記2メソッドを `replyMessageWithHttpInfo` を用いて実装。
- [ ] 定数の集中管理（任意・同一PR内）
  - コマンド正規表現・Postback `action` を `const` でまとめる。
- [ ] ドキュメント整合
  - `関連ファイル` の記載を現実装（`src/line-messaging-api-client.ts`）に合わせる。

### 1. カレンダー一覧
- [ ] `src/usecases/line-webhook-usecase.ts`
  - `message.text` の分岐に `^(?:カレンダー一覧|カレンダー)$` を追加。
  - `userCalendarRepository.getUserCalendars(userId)` で取得し、
    - 件数>0: `replyTextMessages` で整形表示（`name (id)` など）。
    - 件数=0: ガイダンスを返す（例: `"購読中のカレンダーはありません。『カレンダー追加』で登録できます。"`）。

### 2. カレンダー追加
- [ ] コマンドトリガー（テキスト）
  - `^カレンダー追加$` を追加。
  - `tokenRepository.getToken(userId)` が未登録 → 既存の認可URL送信ロジックを実行（現実装流用）。
  - 登録済 → `googleAuth.setTokens(token)` → `new GoogleCalendarApiAdapter(googleAuth)` → `fetchCalendarList()`。
- [ ] クイックリプライ送信
  - 取得したカレンダーから最大N件を `QuickReply` に変換。
  - 各項目は `postback` アクションで、`data` に `{ action: "ADD_CALENDAR_SELECT", calendarId, calendarName }` をシリアライズして設定。
  - `replyTextWithQuickReply(replyToken, "追加するカレンダーを選択してください", items)` を送信。
- [ ] Postback処理
  - `webhookEvent.type === "postback"` を追加し、`parsePostbackData(event.postback.data)` を解釈。
  - `ADD_CALENDAR_SELECT` → `userCalendarRepository.addCalendar({ userId, calendarId, calendarName })` 実行後、完了メッセージを返信。

### 3. カレンダー削除
- [ ] コマンドトリガー（テキスト）
  - `^カレンダー削除\s+(.+)$` で `calendarName` を抽出。
  - `getUserCalendars(userId)` から名称一致を検索。
    - 0件: 未検出メッセージ（一覧を促す）。
    - 複数: 曖昧解消メッセージ（名称の再指定を促す）。
    - 1件: 確認テンプレを送信。
- [ ] 確認テンプレート
  - `replyTemplateMessage` で Confirm を送信。
  - OK: `{ action: "DELETE_CALENDAR_CONFIRM", calendarId, calendarName }`、Cancel: `{ action: "CANCEL" }` を `data` に設定。
- [ ] Postback処理
  - `DELETE_CALENDAR_CONFIRM` → `userCalendarRepository.deleteCalendar(userId, calendarId)` 実行後、完了メッセージ。

### 4. ヘルプ
- [ ] `^(?:ヘルプ|help)$` を追加し、利用可能コマンド一覧を `replyTextMessages` で返信。

### 共有のエラーハンドリング
- [ ] 権限不足/未連携
  - `カレンダー追加` 時にトークン未登録なら認可導線を案内（既存フロー）。
- [ ] API/ネットワークエラー
  - ユーザーへは簡潔な再試行案内、詳細はサーバーログに記録。
- [ ] 未対応メッセージ
  - `"未対応のメッセージです"` にヘルプ誘導を付加。

### セッション管理について
- **結論: 本タスク範囲ではセッション管理は不要**。
  - 理由: 追加・削除いずれも Postback の `data` に必要情報（`calendarId` 等）を保持する無状態設計のため、Lambda メモリや外部セッションを前提にしない。
  - 注意: Lambda は都度停止し得るため、インメモリ実装（`Map` 等）は使用しない。
  - 将来の多段対話が必要になった場合のみ、既存の `OAuthStateTable`（TTL付き）を流用する専用レポジトリを別途追加検討（本タスクでは非対応／IaC変更なし）。