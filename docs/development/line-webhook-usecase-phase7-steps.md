# LineWebhookUseCase フェーズ7 詳細タスク（新規ファイル）

## 概要
- 本ファイルは、既存の `docs/development/line-webhook-usecase-refactor-plan.md` を変更せずに、フェーズ7（コマンド/ルーティングの拡張性）の詳細な作業タスクをまとめたものです。
- 実装時の具体的な観点と、実施順のステップバイステップ手順を含みます。

## 詳細タスク
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

## ステップバイステップ実施手順（フェーズ7）
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