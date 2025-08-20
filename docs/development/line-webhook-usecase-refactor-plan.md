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
  - 型チェック: `bun run type_check`
  - テスト: `bun run test`
- 失敗があれば修正して再実行すること（計画外の変更は行わない）
- CI導入時も同コマンドで検証可能なことを前提とする

---
- 対象: `src/usecases/line-webhook-usecase.ts`
- 関連: `src/handlers/line-webhook-handler.ts`, `__tests__/line-webhook-usecase.test.ts`
 
### フェーズ7 詳細タスク（コマンド/ルーティングの拡張性）
- 設計/ディレクトリ構成
  - 新規作成: `src/usecases/commands/` ディレクトリ
  - 型共有: `src/usecases/commands/types.ts`（`CommandHandler`, `CommandContext`）
  - レジストリ: `src/usecases/commands/registry.ts`（`MessageCommandRegistry`）
- インターフェース定義（まずは同一ファイル内で開始し、後で分離）
  - `CommandHandler`
    - `commandName: string`, `description?: string`
    - `canHandle(message: string, context: CommandContext): boolean`
    - `handle(message: string, context: CommandContext): Promise<WebhookUseCaseResult>`
  - `CommandContext`
    - `userId: string`, `logger`, `timeProvider`
    - 既存依存: リポジトリ/クライアント（Google/Dynamo/LINE など）
    - 生イベント: `messageEvent`（必要最低限）
- レジストリ実装
  - `MessageCommandRegistry`
    - `register(handler: CommandHandler): void`
    - `resolve(message: string, context: CommandContext): CommandHandler | null`
    - 優先度ルール: 明示 `priority`（数値小さい方を優先）を任意対応
  - 初期化ファクトリ: `createDefaultCommandRegistry(deps): MessageCommandRegistry`
    - 既定のコマンド（一覧/追加/削除）を登録
- 既存コマンドのコマンド化（第一弾）
  - `CalendarListCommand`: カレンダー一覧を返し、Quick Reply を提示
  - `CalendarAddCommand`: 追加フローの開始をガイド（postback へ誘導）
  - `CalendarDeleteCommand`: 削除フローの開始をガイド（postback へ誘導）
  - トリガー語彙の定義: 例「一覧」「追加」「削除」「list」「add」「delete」
    - 将来的な i18n を見越して配列定義
- ルーティング統合（`LineWebhookUseCase` 変更は最小）
  - `handleMessage` 内の分岐を `registry.resolve(...).handle(...)` に置換
  - 既存の postback ルートは現状維持（変更なし）
  - フィーチャーフラグ `ENABLE_COMMAND_ROUTING` を導入し段階導入可能に
    - false の場合は従来ロジックを使用、true でレジストリ経由
- エラーハンドリング/ロギング方針の整備
  - 未知コマンド: ヘルプ/ガイダンス文言を返却（MessageTemplates に追加）
  - コマンド実行失敗: 統一失敗レスポンスに集約しログへ `action=command:<name>` を付与
  - 解析不能な長文/添付: 既存のフォールバック応答を維持
- テスト追加（ユニット/結合）
  - `CommandHandler` 契約テスト（canHandle の真偽、handle の副作用）
  - `MessageCommandRegistry` 解決順序/優先度/登録重複の検証
  - 各コマンド: 正常系/異常系/語彙バリエーション、日本語・英語
  - `LineWebhookUseCase` 結合: フラグ ON/OFF での挙動互換性
  - Quick Reply 生成との連携（上限/切り詰め動作）
- 互換性/段階移行
  - 既存メッセージ分岐のロジックを段階的にコマンドへ移設
  - メッセージテンプレートは共通の `MessageTemplates` を使用
  - 既存公開 API（コンストラクタ、`handleWebhookEvent`）は非変更
- 開発者向け DX
  - 新規コマンド雛形: `bun run generate:command <Name>`（任意、時間が許せば）
  - README（開発向け）に「コマンド追加手順」を追記
- 品質ゲート/パフォーマンス
  - `canHandle` は線形走査でも問題ない規模だが、重い正規表現は避ける
  - ユニーク `commandName` を CI で検査（簡易テストで担保）
#### ステップバイステップ実施手順（フェーズ7）
1. ブランチ作成（任意）
   - `git switch -c feat/command-routing-phase7`
2. ディレクトリの用意
   - `src/usecases/commands/` を作成
   - 初期ファイル: `types.ts`, `registry.ts`
3. インターフェースの定義（`src/usecases/commands/types.ts`）
   - `CommandHandler`, `CommandContext` を定義
   - `priority?: number` をハンドラに任意プロパティとして許容
4. レジストリの実装（`src/usecases/commands/registry.ts`）
   - `MessageCommandRegistry`（`register`, `resolve`）を実装
   - `createDefaultCommandRegistry(deps)` を追加（既定コマンドを登録）
5. コマンド実装ファイルの追加
   - `src/usecases/commands/calendar-list.ts`
   - `src/usecases/commands/calendar-add.ts`
   - `src/usecases/commands/calendar-delete.ts`
   - それぞれ `canHandle` のトリガー語彙と `handle` を実装
6. フィーチャーフラグの導入
   - `ENABLE_COMMAND_ROUTING` を設定取得できる箇所に追加（環境変数 or 設定モジュール）
   - 既定は OFF（従来フローを維持）
7. ルーティング統合（`LineWebhookUseCase`）
   - `handleMessage` 内で FF が ON のとき `registry.resolve(...).handle(...)` を使用
   - OFF のとき既存分岐をそのまま使用
8. 文言テンプレート更新
   - 未知コマンド用のヘルプ/ガイダンスを `MessageTemplates` に追加
9. ユニットテストの追加
   - `__tests__/commands/registry.test.ts`: 登録/解決/優先度
   - `__tests__/commands/calendar-*.test.ts`: 各コマンドの正常/異常
   - `__tests__/line-webhook-usecase.command-routing.test.ts`: FF ON/OFF の互換
10. 型チェック/テスト実行
    - `bun run type_check`
    - `bun run test`
11. ドキュメント更新（任意）
    - 開発者向け README に「コマンド追加手順」を追記
12. コミット/プッシュ/PR
    - `git add -A && git commit -m "feat(commands): Phase 7 step-by-step plan and scaffolding docs"`
    - `git push -u origin HEAD`
    - PR を作成（ベース: `main`）
