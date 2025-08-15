# 1. データベース設計・実装

## 概要
ユーザーごとの複数カレンダー管理のためのデータベース構造を設計・実装する。現在の`OAuthTokensTable`に加えて、新たに`UserCalendarsTable`を追加し、ユーザーとカレンダーの購読関係を管理する。

## タスク詳細

### 1.1 ユーザーカレンダー管理テーブル設計
- **優先度**: High
- **工数**: 2-3時間
- **内容**: 
  - ユーザーごとの購読カレンダー情報を管理するDynamoDBテーブル設計
  - テーブル名: `UserCalendarsTable`
  - 主キー: `userId` (LINE User ID)
  - ソートキー: `calendarId` (Google Calendar ID)
  - 属性: `calendarName`, `isEnabled`, `createdAt`, `updatedAt`

### 1.2 DynamoDBテーブルのCloudFormation定義追加
- **優先度**: High  
- **工数**: 1時間
- **内容**: `template.yaml`に新しいテーブル定義を追加

### 1.3 ユーザーカレンダーリポジトリクラス実装
- **優先度**: High
- **工数**: 2-3時間
- **内容**: 
  - `src/lib/user-calendar-repository.ts`
  - CRUD操作 (追加/削除/一覧取得/有効無効切り替え)
  - TypeScript型定義 `src/types/user-calendar-repository.d.ts`

## 技術的考慮事項

### データベース設計のポイント
- **パーティション設計**: ユーザーIDをパーティションキーにして、ユーザーごとのカレンダーリストを効率的に取得
- **スケーラビリティ**: ユーザー数増加に対するDynamoDB設計の考慮
- **インデックス**: 必要に応じてGSI（Global Secondary Index）の検討

### セキュリティ
- ユーザーデータのプライバシー保護
- 適切なアクセス権限設定

## 関連ファイル
- `template.yaml` - CloudFormation定義
- `src/lib/user-calendar-repository.ts` - リポジトリクラス
- `src/types/user-calendar-repository.d.ts` - 型定義