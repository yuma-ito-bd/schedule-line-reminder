# LineWebhookUseCase フェーズ7 タスク分解（コマンド/ルーティングの拡張性）

元ドキュメント: `docs/development/line-webhook-usecase-refactor-plan.md` の「フェーズ7（将来）」を実行可能なタスクへ分解。

## スコープ
- メッセージコマンドをレジストリ駆動へ
- `CommandHandler` インターフェース導入
- `CalendarListCommand`, `CalendarAddCommand`, `CalendarDeleteCommand` の実装
- 新コマンド追加時に `LineWebhookUseCase` を非改変で拡張可能にする

## 非目標（本フェーズ外）
- Postback の完全移行（必要なら将来フェーズ）
- 外部 I/O の大規模な置換や新依存導入
- 既存公開 API（`handleWebhookEvent`）のシグネチャ変更

## 設計タスク
- [ ] `CommandHandler` 抽象の設計
  - 役割: テキスト入力から応答生成までの単一責務ハンドラ
  - インターフェース案: `canHandle(input, context)`, `handle(input, context)`
  - 完了条件: 簡潔な JSDoc、戻り値型・エラー方針が合意
- [ ] `CommandContext` の設計
  - 含有情報: `userId`, `locale`, `services`（外部 I/O 抽象）, `logger`
  - 完了条件: 既存 `LineWebhookUseCase` の依存を過不足なく受け渡し可能
- [ ] `CommandResult` の設計
  - 返却形: `WebhookUseCaseResult` へのマッピングが一意に決まること
  - 完了条件: 全コマンドで共通に扱える結果表現が定義されている
- [ ] `CommandRegistry` の設計
  - 役割: コマンドの登録・探索（名前/エイリアス/述語）
  - 完了条件: 登録/検索 API と重複登録時の扱いが定義済み
- [ ] ルーティング/ディスパッチ方針の設計
  - テキスト正規化（トリム、全角/半角、大小文字）
  - 優先度/最長一致/明示名のいずれかを採用
  - 完了条件: 衝突時の決定規則が文書化

## 実装タスク
- [ ] 型定義の追加（`types/command.ts` 相当の内部モジュール）
- [ ] `CommandRegistry` の実装（登録・検索・列挙）
- [ ] `MessageRouter` の実装（入力正規化→レジストリ探索→`handle` 実行）
- [ ] 既存ユースケースへの最小統合
  - `LineWebhookUseCase` に「メッセージ→ルーター委譲」の導線を追加
  - 既存分岐は後方互換のため残置（機能フラグで切替可能）
- [ ] `CalendarListCommand` の実装
  - 振る舞い: 既存の一覧表示を再現
  - 完了条件: 従来の Quick Reply/文言が等価であること
- [ ] `CalendarAddCommand` の実装
  - 振る舞い: 既存の追加導線（postback 発火含む）を再現
  - 完了条件: 既存シナリオテストが等価に通る
- [ ] `CalendarDeleteCommand` の実装
  - 振る舞い: 既存の削除導線を再現
  - 完了条件: 既存シナリオテストが等価に通る
- [ ] フォールバック/ヘルプコマンドの実装（任意）
  - 未知コマンド時の案内、`help` 一覧の返却
  - 完了条件: 未知入力で後方互換の文言を返す
- [ ] ロギング/エラー方針の適用
  - 失敗時の `success: false` と代表メッセージの統一
  - 追加メタ（`userId`, `action`, `calendarId`）の付与
- [ ] DI/登録ポイントの用意
  - レジストリへコマンドを組み立て時に登録
  - 完了条件: 新コマンドは既存ファイルの非改変で追加可能

## テストタスク
- [ ] ルーター単体テスト
  - 正常系: 正規化・解決・実行の流れ
  - 異常系: 未知・競合・ハンドラ例外の戻り値統一
- [ ] レジストリ単体テスト
  - 重複検知、別名/エイリアス解決、列挙
- [ ] 各コマンドのユニットテスト
  - 成功/失敗、境界（長文・日本語・絵文字）、I/O 例外
- [ ] 統合テスト（`LineWebhookUseCase` 経由）
  - 既存の一覧/追加/削除動作が等価であること
  - 新コマンド追加検証（例: `EchoCommand` を追加して非改変で動作）

## 移行・運用タスク
- [ ] 機能フラグ導入（`command_routing_enabled`）
  - 旧ルートと新ルートを切替可能、ロールバック容易
- [ ] メトリクス/ロギング増強
  - コマンド名、処理時間、失敗率を計測
- [ ] ドキュメント更新
  - 開発者向け「新コマンドの追加手順」
  - 運用者向け「機能フラグ切替手順」

## 完了の定義（DoD）
- 既存公開 API 変更なし (`handleWebhookEvent` 維持)
- 既存テストグリーン + 新規テスト追加分もグリーン
- 既存の一覧/追加/削除シナリオのユーザー体験が等価
- 新コマンドは登録のみで導入可能（既存ファイルの非改変）
- ロールバック手段（機能フラグ）が有効

## 推奨実行順序（マイルストーン）
1. 設計合意（抽象/結果/ルーティング方針）
2. レジストリ/ルーター最小実装 + 単体テスト
3. `CalendarListCommand` 実装 + 統合テスト
4. `CalendarAddCommand`/`CalendarDeleteCommand` 実装 + 統合テスト
5. フォールバック/ヘルプ、ロギング/メトリクス
6. 機能フラグ導入、ドキュメント更新、最終検証

## PR分割計画（5本）

### PR1: 基盤導入（非挙動変更）
- 目的: コマンド基盤を追加しつつアプリ挙動を変えない
- 変更範囲:
  - `types/command.ts`（`CommandHandler`, `CommandContext`, `CommandResult`）
  - `usecases/commands/registry.ts`（`CommandRegistry`）
  - `usecases/commands/router.ts`（`MessageRouter`）
- 手順:
  - [ ] 型・IFを追加（JSDoc含む）
  - [ ] レジストリ/ルーターのスケルトン実装（検索/解決/未登録時の扱い）
  - [ ] 単体テスト作成（正規化・登録・検索・未登録）
- コマンド:
  - [ ] `bun run type_check`
  - [ ] `bun run test`
- 完了条件:
  - [ ] 既存コードへ未配線（機能フラグ未導入）
  - [ ] テストグリーン、挙動変更なし

### PR2: ルーター配線 + 一覧コマンド
- 目的: フラグ配下でメッセージ委譲を有効化し一覧を新経路で提供
- 変更範囲:
  - `usecases/line-webhook-usecase.ts`（機能フラグでメッセージ→ルーター委譲）
  - `usecases/commands/calendar-list.ts`（`CalendarListCommand`）
  - 設定/環境: `command_routing_enabled`
- 手順:
  - [ ] `CalendarListCommand` 実装（従来の文言/Quick Reply を再現）
  - [ ] 機能フラグ導入（既定: OFF）
  - [ ] 統合テスト（一覧経路の等価性）
- コマンド:
  - [ ] `bun run type_check`
  - [ ] `bun run test`
- 完了条件:
  - [ ] フラグOFFで従来、ONで新経路（一覧のみ）
  - [ ] 既存の一覧体験が等価

### PR3: 追加/削除コマンド
- 目的: 追加・削除をコマンド化し新経路で等価動作
- 変更範囲:
  - `usecases/commands/calendar-add.ts`（`CalendarAddCommand`）
  - `usecases/commands/calendar-delete.ts`（`CalendarDeleteCommand`）
- 手順:
  - [ ] `CalendarAddCommand` 実装（postback 発火含む）
  - [ ] `CalendarDeleteCommand` 実装
  - [ ] 統合テスト（追加/削除の等価性）
- コマンド:
  - [ ] `bun run type_check`
  - [ ] `bun run test`
- 完了条件:
  - [ ] フラグONで一覧/追加/削除すべて新経路で等価

### PR4: フォールバック/ヘルプ + 例外・ロギング統一
- 目的: 未知入力の案内と失敗時の処理方針統一
- 変更範囲:
  - `usecases/commands/help.ts`（任意）
  - 共通ロギング/エラーハンドリング適用
- 手順:
  - [ ] 未知入力→フォールバック/`help` の実装
  - [ ] ログへ文脈（`userId`, `action`, `calendarId`）付与を統一
  - [ ] 失敗時 `success: false` の戻りを統一
- コマンド:
  - [ ] `bun run type_check`
  - [ ] `bun run test`
- 完了条件:
  - [ ] 未知入力時の文言が後方互換
  - [ ] 例外時のログ/戻りが統一

### PR5: メトリクス/ドキュメント/有効化
- 目的: 運用可視化とドキュメント整備、段階的有効化
- 変更範囲:
  - メトリクス記録（コマンド名/処理時間/失敗率）
  - ドキュメント整備
- 手順:
  - [ ] メトリクスの発行ポイント追加
  - [ ] ドキュメント更新：新コマンド追加手順/機能フラグ切替手順
  - [ ] 検証後に既定ON（段階ロールアウト）
- コマンド:
  - [ ] `bun run type_check`
  - [ ] `bun run test`
- 完了条件:
  - [ ] ドキュメント反映・既定ONで安定稼働