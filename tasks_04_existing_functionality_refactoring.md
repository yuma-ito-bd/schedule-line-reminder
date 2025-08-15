# 4. 既存機能のリファクタリング

## 概要
現在の固定`primary`カレンダーベースのシステムを、複数カレンダー対応に移行するための既存コードのリファクタリングを実施する。通知機能と認証フローの改修を行う。

## タスク詳細

### 4.1 カレンダーイベント通知の改修
- **優先度**: High
- **工数**: 2-3時間
- **内容**:
  - 固定の`primary`カレンダーから、ユーザーの購読カレンダーリストベースに変更
  - `CalendarEventsUseCase`の修正
  - 複数カレンダーからのイベント集約とメッセージ生成

### 4.2 認証フローの拡張
- **優先度**: Low
- **工数**: 1-2時間  
- **内容**:
  - OAuth認証成功時に自動的にデフォルトカレンダーを購読リストに追加
  - `OAuthCallbackUseCase`の修正

## リファクタリング詳細

### CalendarEventsUseCase の改修

#### 現在の実装
- 固定で`primary`カレンダーからイベントを取得
- 単一カレンダーのイベントリストを処理

#### 改修後の実装
- ユーザーの購読カレンダーリストを `UserCalendarRepository` から取得
- 複数カレンダーから並列でイベントを取得
- イベントを時系列でマージしてメッセージ生成

#### 主な変更点
```typescript
// Before
const events = await googleCalendarAdapter.fetchEvents('primary', startDate, endDate);

// After  
const userCalendars = await userCalendarRepository.getCalendars(userId);
const eventsByCalendar = await Promise.all(
  userCalendars.map(calendar => 
    googleCalendarAdapter.fetchEvents(calendar.calendarId, startDate, endDate)
  )
);
const mergedEvents = mergeAndSortEvents(eventsByCalendar);
```

### OAuthCallbackUseCase の拡張

#### 現在の実装
- OAuth認証完了後、トークンを保存するのみ

#### 改修後の実装
- OAuth認証完了後、デフォルトカレンダー（primary）を自動的に購読リストに追加
- 新規ユーザーの初期設定として機能

#### 主な変更点
```typescript
// 認証成功後に追加
await userCalendarRepository.addCalendar({
  userId,
  calendarId: 'primary', 
  calendarName: 'メインカレンダー',
  isEnabled: true
});
```

## 技術的考慮事項

### 後方互換性
- 既存ユーザーのデータ移行戦略
- グレースフルな移行期間の設定

### エラーハンドリング
- カレンダーアクセス不可の場合の適切な処理
- 部分的なエラーでも他のカレンダーは正常に動作させる

### パフォーマンス
- 複数カレンダーからの並列取得による最適化
- Lambda関数のコールドスタート対策

### データ整合性
- トークンの有効性確認
- カレンダー権限の定期的な検証

## 影響を受けるファイル
- `src/use-cases/calendar-events-use-case.ts` - イベント取得ロジック
- `src/use-cases/oauth-callback-use-case.ts` - 認証コールバック処理
- `src/adapters/google-calendar-api-adapter.ts` - API アダプター（メソッドの拡張）
- 関連するテストファイル

## 移行戦略

### Phase 1: 新機能実装
- UserCalendarRepository の実装
- 複数カレンダー対応のAPI拡張

### Phase 2: リファクタリング
- 既存のUseCase修正
- テスト実施と検証

### Phase 3: データ移行
- 既存ユーザーへのデフォルトカレンダー追加
- 動作確認と監視