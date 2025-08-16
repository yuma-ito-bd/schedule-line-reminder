# LineWebhookUseCase リファクタリング実行計画

## 目的
- **可読性・変更容易性の向上**: 責務分割、重複排除、命名の明確化
- **型安全性・堅牢性の向上**: Postbackデータの検証、type guard導入
- **外部依存境界の明確化**: LINE/Google/Dynamo との境界を明確化しモック容易化
- **テスト容易性の向上**: 単体テスト単位で検証できる構造に変更

## 現状の課題
- `handleWebhookEvent` にイベント分岐と外部I/Oが集中し肥大化
- postback `data` の JSON パースが脆弱（スキーマ検証なし）
- ユーザー向け文言・定数の散在（変更コスト増）
- 例外時のレスポンス・ロギング方針が一貫しない

## リファクタリング方針とステップ
### フェーズ1: 同ファイル内の関数分割（非破壊）
- `handleWebhookEvent` を以下に分割し、早期 return でネストを浅くする
  - `handleUnfollow`, `handlePostback`, `handleMessage`
  - `handleCalendarList`, `handleCalendarAdd`, `handleCalendarDelete`
- 返却は統一の `WebhookUseCaseResult` を維持
- 既存テスト互換を維持（外部I/Fは変更しない）

### フェーズ2: 定数・文言・ユーティリティの集約
- 定数: `QUICK_REPLY_CALENDAR_LIMIT`, `ADD_CALENDAR_SELECT`, `DELETE_CALENDAR_SELECT`
- 文言: メッセージを `MessageTemplates` として集約（まずは同ファイル内）
- ユーティリティ: `truncateLabel` と Quick Reply 生成ロジックを私有 helper に整理

### フェーズ3: 型安全性の強化
- Postback データの type guard を導入
  - `isAddCalendarPostback`, `isDeleteCalendarPostback`
- 可能なら将来的に `zod` 等のスキーマ検証へ移行（今回は依存追加なし）
- LINE イベントの type guard（`isTextMessageEvent`）で分岐明確化

### フェーズ4: Quick Reply 生成の分離
- `createCalendarQuickReplyItems` を純粋関数化し、
  - ラベル切り詰め、上限、postback データ生成を一箇所に集約
- 将来は `src/usecases/helpers/quick-reply.ts` へ移設可能な形を整える

### フェーズ5: エラーハンドリングとロギングの統一
- 外部I/O 呼び出し点を `try-catch` で局所化
- 失敗時の `WebhookUseCaseResult` を統一（`success: false` と代表メッセージ）
- ログには `userId`, `action`, `calendarId` 等の文脈を付与

### フェーズ6: 構造の段階的分割（必要に応じて）
- 第1段階がグリーン後にファイル分割を検討
  - Postback 型/guard: `src/types/postback.ts`
  - Quick Reply helper: `src/usecases/helpers/quick-reply.ts`
  - メッセージテンプレート: `src/usecases/messages.ts`
- `LineWebhookUseCase` はルーティング／オーケストレーションに専念

### フェーズ7（将来）: コマンド/ルーティングの拡張性
- メッセージコマンドをレジストリ駆動へ
  - `CommandHandler` インターフェース
  - `CalendarListCommand`, `CalendarAddCommand`, `CalendarDeleteCommand`
- 新コマンド追加時に `LineWebhookUseCase` 非改変で拡張可能に

## テスト計画
- 既存 `__tests__/line-webhook-usecase.test.ts` は維持
- 追加ユニットテスト（目安）
  - Postback 型ガード（正常/異常）
  - Quick Reply 生成（上限超過、長文切り詰め、日本語・絵文字）
  - メッセージコマンド分岐（一覧/追加/削除）
  - 例外時のレスポンスとロギング

## 受け入れ条件
- 外部I/F（コンストラクタ、`handleWebhookEvent` シグネチャ）変更なし
- 既存テストがグリーン、追加テストも通過
- エラー時のメッセージと HTTP 応答が従来互換（ハンドラ側の判定が崩れない）

## 実行順序
1. フェーズ1: 関数分割・ガード導入・定数/文言の集約
2. フェーズ2: helper 抽出・型ガードのテスト追加
3. フェーズ3: （任意）ファイル分割・コマンド化

## 実行時の品質ゲート（必須）
- すべての変更は以下を必ず実行してグリーンであることを確認する
  - 型チェック: `bun x tsc -p tsconfig.json --noEmit`
  - テスト: `bun test`
- 失敗があれば修正して再実行すること（計画外の変更は行わない）
- CI導入時も同コマンドで検証可能なことを前提とする

---
- 対象: `src/usecases/line-webhook-usecase.ts`
- 関連: `src/handlers/line-webhook-handler.ts`, `__tests__/line-webhook-usecase.test.ts`