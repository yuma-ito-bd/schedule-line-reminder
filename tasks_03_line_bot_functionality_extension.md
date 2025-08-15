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

## 実装ToDo（コードレベル）

- [ ] 依存注入の拡張: `src/usecases/line-webhook-usecase.ts`
  - **変更**: `LineWebhookUseCase` のコンストラクタに `userCalendarRepository: Schema$UserCalendarRepository` を追加し、フィールドに保持する。
  - **呼び出し元修正**: `src/handlers/line-webhook-handler.ts` で `UserCalendarRepository` を生成して渡す。
    - 例: `const userCalendarRepository = new UserCalendarRepository();`
    - 既存: `new LineWebhookUseCase(lineClient, googleAuth, stateRepository, tokenRepository)`
    - 変更後: `new LineWebhookUseCase(lineClient, googleAuth, stateRepository, tokenRepository, userCalendarRepository)`

- [ ] イベント型の拡張: `src/types/line-webhook-event.d.ts`
  - **PostbackEvent** を追加し、`LineWebhookEvent` のユニオンに含める。
    - 仕様（簡易）:
      - `type: "postback"`
      - `replyToken: string`
      - `postback: { data: string }`
      - `source.userId: string`
      - 他の共通プロパティは既存 `MessageEvent` を参考に付与

- [ ] Postbackデータ型の定義: 新規 `src/types/line-bot.d.ts`
  - `PostbackAction` の種類とペイロードを型で定義。
    - `type PostbackData = { action: "ADD_CALENDAR_SELECT"; calendarId: string; calendarName: string } | { action: "DELETE_CALENDAR_CONFIRM"; calendarId: string; calendarName: string } | { action: "CANCEL" }`。
  - `serializePostbackData(data: PostbackData): string` と `parsePostbackData(s: string): PostbackData | null` を宣言（実装は UseCase 側でも可だが型はここで持つ）。

- [ ] LINEクライアントI/Fの拡張: `src/types/line-messaging-api-adapter.d.ts`
  - 既存 `pushTextMessages`, `replyTextMessages` に加え以下を追加。
    - `replyTextWithQuickReply(replyToken: string, text: string, items: messagingApi.QuickReplyItem[]): Promise<messagingApi.ReplyMessageResponse>`
    - `replyTemplateMessage(replyToken: string, message: messagingApi.TemplateMessage): Promise<messagingApi.ReplyMessageResponse>`

- [ ] LINEクライアント実装の拡張: `src/line-messaging-api-client.ts`
  - 追加メソッドを実装。
    - `replyTextWithQuickReply`: `messages: [{ type: "text", text, quickReply: { items } }]` を `replyMessageWithHttpInfo` に渡す。
    - `replyTemplateMessage`: `messages: [message]` を `replyMessageWithHttpInfo` に渡す。

- [ ] コマンドディスパッチの実装: `src/usecases/line-webhook-usecase.ts`
  - 文字メッセージ処理に以下の分岐を追加。
    - `^(?:カレンダー一覧|カレンダー)$`
      - `userCalendarRepository.getUserCalendars(userId)` を取得し、一覧をテキストで整形して `replyTextMessages`。
      - 0件時はガイダンス（例: `"購読中のカレンダーはありません。『カレンダー追加』で登録できます。"`）。
    - `^(?:ヘルプ|help)$`
      - 利用可能コマンドを `replyTextMessages` で返却。
    - `^カレンダー削除\s+(.+)$`
      - 正規表現で `calendarName` 抽出。
      - `userCalendarRepository.getUserCalendars(userId)` から名称一致（完全一致、複数一致時は曖昧解消案内）。
      - 1件のみ一致時、Confirmテンプレ（`replyTemplateMessage`）を送信。
        - Postback: `{ action: "DELETE_CALENDAR_CONFIRM", calendarId, calendarName }` と `{ action: "CANCEL" }` を付与。
    - `^カレンダー追加$`
      - `tokenRepository.getToken(userId)` を取得。
        - 未認証なら既存処理（認可URL生成・保存・返信）を踏襲。
        - 認証済みなら `googleAuth.setTokens(token)` → `new GoogleCalendarApiAdapter(googleAuth)` → `fetchCalendarList()`
          - 上位10件程度を QuickReply に変換し `replyTextWithQuickReply(replyToken, "追加するカレンダーを選択してください", items)` を送信。
          - QuickReply の各 `action` は `postback` とし、`data` に `{ action: "ADD_CALENDAR_SELECT", calendarId, calendarName }` をシリアライズして格納。

- [ ] Postbackイベント処理: `src/usecases/line-webhook-usecase.ts`
  - `webhookEvent.type === "postback"` 分岐を追加し、`parsePostbackData(webhookEvent.postback.data)` でアクションを判定。
    - `ADD_CALENDAR_SELECT`
      - `userCalendarRepository.addCalendar({ userId, calendarId, calendarName })` を実行。
      - 正常終了レスポンスとともに `replyTextMessages` で完了メッセージ。
    - `DELETE_CALENDAR_CONFIRM`
      - `userCalendarRepository.deleteCalendar(userId, calendarId)` を実行。
      - 完了メッセージを `replyTextMessages`。
    - `CANCEL`
      - キャンセルメッセージを送信。
  - エラー時はユーザ向けメッセージ（再試行案内）+ サーバログ出力。

- [ ] クイックリプライ/テンプレ生成ヘルパー（任意）: `src/usecases/line-webhook-usecase.ts` もしくはユーティリティ新設
  - `toQuickReplyItems(calendars: Schema$CalendarListEntry[]): messagingApi.QuickReplyItem[]`
  - `buildDeleteConfirmTemplate(name: string, dataOk: string, dataCancel: string): messagingApi.TemplateMessage`

- [ ] セッション管理（簡易）: 新規 `src/lib/session-manager.ts`
  - とりあえず Lambda プロセス内 `Map<string, { state: string; expiresAt: number }>` によるインメモリ実装（TTLつき）。
  - API: `get(userId)`, `set(userId, state, ttlSec)`, `clear(userId)`。
  - 追加フローの途中状態（例えば、ページング位置など）を保持できるようキーを拡張できる設計に。
  - 既存の IaC を変更しない（Dynamoのテーブル追加はしない）。

- [ ] `src/handlers/line-webhook-handler.ts` の最小変更
  - 依存注入で `UserCalendarRepository` を追加する以外は、パース/検証の流れは現状維持。
  - `LineWebhookEvent` 型拡張により postback の受け取りも同関数で兼用。

- [ ] エラーハンドリング/メッセージ文言
  - 権限不足（トークン未保存・失効）: `カレンダー追加` 実行時に認可導線を案内。
  - APIエラー/ネットワークエラー: 汎用メッセージ + ログに詳細。
  - 未対応メッセージは現行 `"未対応のメッセージです"` をヘルプ誘導つきに改善。

- [ ] 文字列/正規表現の定数化（可読性向上）
  - コマンドキーワード、正規表現、Postback `action` 名を `const` で集中管理。

- [ ] ドキュメントと差分の整合
  - `関連ファイル` セクションの `src/adapters/line-messaging-api-adapter.ts` は現状 `src/line-messaging-api-client.ts` を使用しているため、表記を合わせる（ドキュメント修正）。

### 実装の目安となる関数シグネチャ（抜粋）

```ts
// src/usecases/line-webhook-usecase.ts（一部）
private async handleTextMessage(event: LineWebhookEvent & { type: "message" }): Promise<WebhookUseCaseResult>;
private async handlePostback(event: LineWebhookEvent & { type: "postback" }): Promise<WebhookUseCaseResult>;

// Helper（同ファイル or Util）
private toQuickReplyItems(entries: Schema$CalendarListEntry[]): messagingApi.QuickReplyItem[];
private buildDeleteConfirmTemplate(name: string, okData: string, cancelData: string): messagingApi.TemplateMessage;
```

```ts
// src/line-messaging-api-client.ts（追加メソッド）
async replyTextWithQuickReply(replyToken: string, text: string, items: messagingApi.QuickReplyItem[]): Promise<messagingApi.ReplyMessageResponse>;
async replyTemplateMessage(replyToken: string, message: messagingApi.TemplateMessage): Promise<messagingApi.ReplyMessageResponse>;
```

```ts
// src/types/line-webhook-event.d.ts（追記の例）
type PostbackEvent = {
  type: "postback";
  replyToken: string;
  postback: { data: string };
  source: { type: "user"; userId: string };
  timestamp: number;
  mode: "active";
};
export type LineWebhookEvent = MessageEvent | UnfollowEvent | PostbackEvent;
```

```ts
// src/types/line-bot.d.ts（新規）
export type PostbackData =
  | { action: "ADD_CALENDAR_SELECT"; calendarId: string; calendarName: string }
  | { action: "DELETE_CALENDAR_CONFIRM"; calendarId: string; calendarName: string }
  | { action: "CANCEL" };
export function serializePostbackData(data: PostbackData): string;
export function parsePostbackData(s: string): PostbackData | null;
```
