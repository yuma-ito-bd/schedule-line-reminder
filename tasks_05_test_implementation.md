# 5. テスト実装

## 概要
複数カレンダー管理機能の品質保証のため、新規実装コンポーネントのユニットテストと、システム全体の結合テストを実装する。テスト駆動開発（TDD）のアプローチも考慮し、堅牢なシステムを構築する。

## タスク詳細

### 5.1 ユニットテスト追加
- **優先度**: Medium
- **工数**: 4-5時間
- **内容**:
  - `UserCalendarRepository`のテスト
  - 新しい`GoogleCalendarApiAdapter`メソッドのテスト  
  - `LineWebhookUseCase`の拡張機能テスト

### 5.2 結合テスト
- **優先度**: Low
- **工数**: 2-3時間
- **内容**:
  - LINE Bot全体のフロー確認
  - 実際のGoogle Calendar APIとの連携テスト

## テスト実装詳細

### 5.1 ユニットテスト詳細

#### UserCalendarRepository テスト
- **ファイル**: `test/lib/user-calendar-repository.test.ts`
- **テスト対象メソッド**:
  - `addCalendar()` - カレンダー追加
  - `removeCalendar()` - カレンダー削除  
  - `getCalendars()` - カレンダー一覧取得

- **テストケース**:
  - 正常系: 各メソッドの基本動作
  - 異常系: 存在しないカレンダーの操作
  - 境界値: 空のリスト、大量のカレンダー
  - DynamoDB接続エラーのモック

#### GoogleCalendarApiAdapter テスト
- **ファイル**: `test/adapters/google-calendar-api-adapter.test.ts`
- **テスト対象メソッド**:
  - `fetchCalendarList()` - カレンダーリスト取得
  - `fetchEvents()` - 複数カレンダー対応版

- **テストケース**:
  - 正常系: APIレスポンスの適切な処理
  - 異常系: API制限、権限エラー、ネットワークエラー
  - モック: Google Calendar APIレスポンスのモック化
  - 並列処理: 複数カレンダーの同時取得テスト

#### LineWebhookUseCase テスト
- **ファイル**: `test/use-cases/line-webhook-use-case.test.ts`
- **テスト対象機能**:
  - カレンダー管理コマンドの処理
  - 対話式フローのセッション管理
  - エラーメッセージの生成

- **テストケース**:
  - コマンド解析: 各種コマンドの正確な認識
  - レスポンス生成: 適切なLINEメッセージフォーマット
  - セッション管理: 状態の保持と復元
  - エラーハンドリング: 各種エラー状況での適切な応答

### 5.2 結合テスト詳細

#### LINE Bot フロー テスト
- **ファイル**: `test/integration/line-bot-flow.test.ts`
- **テストシナリオ**:
  1. ユーザー認証フロー
  2. カレンダー追加から通知までの完全フロー
  3. カレンダー削除
  4. 複数カレンダーでの通知動作

#### Google Calendar API 連携テスト
- **ファイル**: `test/integration/google-calendar-integration.test.ts`
- **テスト内容**:
  - 実際のGoogle Calendar APIとの通信
  - OAuth認証フローの動作確認
  - レート制限への対応確認
  - 権限エラーの適切な処理

## テスト環境・設定

### モックとスタブ
- **DynamoDB**: AWS SDK のモック化
- **Google Calendar API**: axios-mock-adapter を使用
- **LINE Messaging API**: 送信APIのモック化

### テストデータ
- **ユーザー**: テスト用のLINE User ID
- **カレンダー**: モックカレンダーデータ
- **イベント**: 様々なパターンのテストイベント

### 環境変数設定
```bash
# テスト専用環境変数
NODE_ENV=test
DYNAMODB_ENDPOINT=http://localhost:8000  # DynamoDB Local
GOOGLE_CALENDAR_CLIENT_ID=test_client_id
LINE_CHANNEL_ACCESS_TOKEN=test_token
```

### CI/CD 統合
- **GitHub Actions**: プルリクエスト時の自動テスト実行
- **カバレッジ**: 最低80%のコードカバレッジを目標
- **レポート**: テスト結果とカバレッジレポートの生成

## テスト戦略

### テストピラミッド
- **ユニットテスト (70%)**: 各コンポーネントの詳細テスト
- **結合テスト (20%)**: コンポーネント間の連携テスト  
- **E2Eテスト (10%)**: ユーザーシナリオベースのテスト

### テストの優先順位
1. **High**: 核となるビジネスロジック（UserCalendarRepository）
2. **Medium**: API連携部分（GoogleCalendarApiAdapter）
3. **Low**: UI/UX部分（LineWebhookUseCase の詳細）

### 継続的テスト
- **リグレッションテスト**: 既存機能への影響確認
- **パフォーマンステスト**: レスポンス時間の監視
- **セキュリティテスト**: 認証・認可の適切性確認

## 関連ファイル
- `test/lib/user-calendar-repository.test.ts` - リポジトリテスト
- `test/adapters/google-calendar-api-adapter.test.ts` - APIアダプターテスト
- `test/use-cases/line-webhook-use-case.test.ts` - UseCase テスト
- `test/integration/line-bot-flow.test.ts` - 結合テスト
- `test/integration/google-calendar-integration.test.ts` - API連携テスト
- `jest.config.js` - Jest設定
- `.github/workflows/test.yml` - CI/CD設定