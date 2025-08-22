# LINE「通知テスト」機能 追加計画

## 背景・目的
- 毎日21時(JST)に配信している「明日から1週間の予定」メッセージと同じ内容を、ユーザーが任意タイミングで確認できる「通知テスト」を追加する。
- ユーザーがLINEで「通知テスト」と送信したら、その場で定時配信と同一フォーマットのメッセージを返信する。

## 現状把握（関連実装）
- 定時配信（毎日21時）
  - インフラ: `template.yaml` → `CalendarEventsNotifier` が `cron(0 12 * * ? *)`（UTC）で起動
  - ハンドラ: `src/handlers/calendar-events-handler.ts`
  - ユースケース: `src/usecases/calendar-events-usecase.ts`
  - 通知ロジック: `src/calendar-events-notifier.ts`
  - メッセージ生成: `src/calendar-message-builder.ts`
- LINE Webhook
  - ハンドラ: `src/handlers/line-webhook-handler.ts`
  - ユースケース: `src/usecases/line-webhook-usecase.ts`
  - 返信API: `src/line-messaging-api-client.ts`
- 権限
  - Webhook Lambda は `OAuthTokensTable`（GetItem/DeleteItem）と `UserCalendarsTable`（Put/Delete/Query）にアクセス可能

## 要件
- ユーザーが「通知テスト」と送信したら、リプライで定時配信（21時）と同一のメッセージを返却する。
- 通知対象カレンダー・期間計算・フォーマットは定時配信と完全一致（`CalendarEventsNotifier`/`CalendarMessageBuilder`に準拠）。
- Google連携未完了や購読カレンダー未設定時は、既存のガイダンス/エラーメッセージで案内する。
- 失敗時はログ出力し、ユーザーには簡潔な失敗メッセージを返す。

## 方針（再利用と最小変更）
- 「定時配信と同じ内容」を担保するため、既存のロジックを最大限再利用する。
- メッセージ生成の共通化を行い、Webhook経由のワンショット返信でも同じ関数を使う。

推奨案（A）
- 新規 `CalendarPreviewUseCase`（名称例）を追加し、指定 `userId` のプレビュー文字列を返す。
  - `OAuthTokensTable` から当該ユーザーのトークン取得
  - `UserCalendarsTable` から購読カレンダー取得
  - `GoogleCalendarApiAdapter` で期間内イベント取得（期間計算は `CalendarEventsNotifier` と整合）
  - `CalendarMessageBuilder` でメッセージ生成
- `LineWebhookUseCase` にテキスト「通知テスト」ハンドラを追加し、`replyTextMessages` で返信。

代替案（B）
- `CalendarEventsNotifier` に「メッセージ生成のみ」を担う静的/ヘルパー関数を抽出し、Webhook から呼び出す。

本ドキュメントでは実装明瞭性の観点で「推奨案（A）」を採用。

## 実装タスク
1) ユースケース追加（プレビュー生成）
- 新規: `src/usecases/calendar-preview-usecase.ts`（名称例）
  - 入力: `userId: string`
  - 振る舞い:
    - `TokenRepository` からトークン取得（なければガイダンス返却）
    - `GoogleAuthAdapter` にトークン設定（更新時は `TokenRepository.updateToken` 反映）
    - `UserCalendarRepository` で購読カレンダー取得
    - 期間計算（`CalendarEventsNotifier` の `buildSpan()` と同等: 明日0:00〜7日後23:59:59）
    - `GoogleCalendarApiAdapter.fetchEvents` で期間内イベント取得
    - `CalendarMessageBuilder` で文字列生成し返却

2) Webhookユースケース対応
- 変更: `src/usecases/line-webhook-usecase.ts`
  - `handleMessage` にて、テキストが「通知テスト」に厳密一致した場合:
    - `source.userId` を取得
    - `CalendarPreviewUseCase` を呼び出し、得られた文字列を `replyTextMessages` で返信
  - 認可未完了/購読カレンダーなし等のケースは既存テンプレを活用して案内

3) メッセージテンプレ/文言確認
- 既存テンプレ `src/usecases/messages.ts` に失敗文言が揃っているか確認し、必要なら最小限追加

4) ログ/監視
- Webhook ログに `action: "preview"`, `userId`, `result` を出力

5) テスト
- 単体
  - `CalendarPreviewUseCase`: 正常系（イベントあり/なし、終日）/ 異常系（トークンなし、API失敗）
  - `LineWebhookUseCase`: 「通知テスト」受信でプレビュー返信すること
- 結合
  - モックで Google/LINE クライアントを差し替え、E2Eに近いフローを検証

6) ヘルプコマンド更新
- 変更: `src/usecases/messages.ts` の `helpText` に以下を追記
  - `- 通知テスト: 定時配信のプレビューを返信`

## 変更箇所（想定）
- 追加: `src/usecases/calendar-preview-usecase.ts`
- 変更: `src/usecases/line-webhook-usecase.ts`（テキスト判定・分岐追加）
- 既存流用: `src/calendar-events-notifier.ts`（期間計算の整合）/ `src/calendar-message-builder.ts`
- 変更: `src/usecases/messages.ts`（ヘルプに「通知テスト」を追加）

## 受け入れ条件（Acceptance Criteria）
- ユーザーが「通知テスト」を送信すると、定時配信と同一フォーマットのメッセージが1通返信される。
- イベントが0件の日でも、定時配信と同じ「予定なし」構成で日付枠が並ぶ。
- 未認可ユーザーには認可ガイダンスを返す。
- 実装は既存の定時配信ロジックと整合し、差異がない。
- ヘルプメッセージに「通知テスト」が表示される。

## テスト観点
- フォーマット一致: `CalendarMessageBuilder` の出力が定時配信時と同一
- 期間一致: 明日開始の7日分（JST）
- 終日/営業時間内イベントのフォーマット差異
- 大量イベント時のメッセージ長（分割方針があればそれに従う）
- 例外時のハンドリング（Google API/LINE API 失敗）
- ヘルプ文言に「通知テスト」行が含まれること

## セキュリティ・権限・構成
- Webhook Lambda 権限は既に `OAuthTokensTable`/`UserCalendarsTable` 参照が可能
- 追加の環境変数は不要想定（既存と同じ）
- PII ログは出さない（userId は必要最小限）

## リリース手順（想定）
1. 実装・単体/結合テスト追加
2. デプロイ（SAM）
3. ステージングで手動検証（テスト用アカウントで「通知テスト」）
4. 本番リリース

## Open Questions（要確認）
- グループ/ルームでの発言は対象外で良いか（個人チャットのみ運用？）
- トリガー文言バリエーション（例: 半角/全角スペース混在、「テスト通知」等）を許容するか
- メッセージ長が4,000文字超の場合の分割送信方針（現状は1通想定）
- タイムゾーンはJST固定で問題ないか
- リプライかつ既読性向上のため Quick Reply の付与が必要か

---

参考ファイル
- `template.yaml`
- `src/handlers/calendar-events-handler.ts`
- `src/usecases/calendar-events-usecase.ts`
- `src/calendar-events-notifier.ts`
- `src/calendar-message-builder.ts`
- `src/handlers/line-webhook-handler.ts`
- `src/usecases/line-webhook-usecase.ts`
- `src/line-messaging-api-client.ts`