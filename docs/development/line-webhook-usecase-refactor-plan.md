
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