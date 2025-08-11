# GitHub Issues for AWS Chatbot CloudWatch to Slack Notification System (IaC Approach)

## Issue #1: Slack Workspace IDとChannel IDの取得・準備

**Priority:** High  
**Labels:** `setup`, `slack`, `prerequisites`  
**Assignee:** TBD  
**Estimated Time:** 30 minutes - 1 hour

### Description
CloudFormationテンプレートで使用するSlack Workspace IDとChannel IDを取得し、デプロイ準備を行う。

### Tasks
- [ ] Slack Workspace IDの取得方法を確認
- [ ] 対象チャンネルでSlack Channel IDを取得
- [ ] デプロイ用パラメータファイル（parameters.json）を作成
- [ ] AWS CLI/SAM CLIの設定確認

### Acceptance Criteria
- [ ] Slack Workspace IDが正しい形式（T0XXXXXXXXX）で取得されている
- [ ] Slack Channel IDが正しい形式（C0XXXXXXXXX）で取得されている
- [ ] parameters.jsonファイルが作成されている
- [ ] AWS CLI認証が正常に動作する

### Documentation Reference
- `/workspace/deployment-guide.md` の「事前準備」セクションを参照

---

## Issue #2: CloudFormationテンプレートの検証と調整

**Priority:** High  
**Labels:** `infrastructure`, `cloudformation`, `validation`  
**Assignee:** TBD  
**Estimated Time:** 1-2 hours

### Description
作成されたCloudFormationテンプレート（chatbot-template.yml）を環境に合わせて調整し、構文検証を行う。

### Tasks
- [ ] CloudFormationテンプレートの構文検証
- [ ] パラメータの調整（プロジェクト名、環境名等）
- [ ] 監視対象メトリクスの設定確認・調整
- [ ] IAM権限の確認と最小権限の原則適用
- [ ] リソース名の命名規則確認

### Acceptance Criteria
- [ ] `aws cloudformation validate-template` でエラーがない
- [ ] パラメータが環境に適合している
- [ ] 監視対象が正しく設定されている
- [ ] IAM権限が適切に設定されている
- [ ] リソース命名が規則に従っている

### Files
- `/workspace/chatbot-template.yml`
- `/workspace/parameters.json`

---

## Issue #3: CloudFormation Stackのデプロイ実行

**Priority:** High  
**Labels:** `deployment`, `infrastructure`  
**Assignee:** TBD  
**Estimated Time:** 1-2 hours

### Description
CloudFormationテンプレートを使用してAWS ChatbotとCloudWatch通知システム全体をデプロイする。

### Tasks
- [ ] parameters.jsonの最終確認
- [ ] CloudFormation Stackのデプロイ実行
- [ ] デプロイ状況の監視
- [ ] 作成されたリソースの確認
- [ ] スタック出力値の記録

### Acceptance Criteria
- [ ] CloudFormation Stackが正常にCREATE_COMPLETEになる
- [ ] すべてのリソース（SNS、IAM、Chatbot、CloudWatch Alarm）が作成されている
- [ ] スタック出力値が正しく表示される
- [ ] エラーが発生していない

### Commands Reference
```bash
aws cloudformation create-stack \
  --stack-name chatbot-notifications-stack \
  --template-body file://chatbot-template.yml \
  --parameters file://parameters.json \
  --capabilities CAPABILITY_NAMED_IAM
```

### Dependencies
- Issue #1 (Slack ID取得) が完了している必要がある
- Issue #2 (テンプレート検証) が完了している必要がある

---

## Issue #4: AWS Chatbot設定の動作確認

**Priority:** Medium  
**Labels:** `testing`, `validation`, `chatbot`  
**Assignee:** TBD  
**Estimated Time:** 1 hour

### Description
デプロイされたAWS Chatbot設定が正常に動作し、Slackチャンネルとの接続が確立されていることを確認する。

### Tasks
- [ ] AWS Chatbot コンソールでの設定確認
- [ ] Slackワークスペースでの連携確認
- [ ] SNSトピックとの連携確認
- [ ] ログ出力の確認

### Acceptance Criteria
- [ ] AWS Chatbot設定がActiveになっている
- [ ] Slackチャンネルに接続確認メッセージが表示される
- [ ] SNSトピックが正しくサブスクライブされている
- [ ] CloudWatch Logsでログが出力されている

### Validation Commands
```bash
aws chatbot describe-slack-channel-configurations
aws sns list-topics | grep cloudwatch-alarms
```

### Dependencies
- Issue #3 (Stack デプロイ) が完了している必要がある

---

## Issue #5: CloudWatch Alarmテスト実行

**Priority:** Medium  
**Labels:** `testing`, `cloudwatch`, `notifications`  
**Assignee:** TBD  
**Estimated Time:** 1-2 hours

### Description
CloudWatch Alarmを手動でトリガーし、Slackへの通知が正常に動作することをテストする。

### Tasks
- [ ] 手動でのアラーム状態変更テスト
- [ ] Slack通知受信確認
- [ ] 通知内容とフォーマットの確認
- [ ] 復旧通知（OK状態）のテスト
- [ ] 通知遅延の測定
- [ ] エラーケースのテスト

### Acceptance Criteria
- [ ] アラーム発生時にSlackに通知が届く
- [ ] 通知内容が理解しやすい形式である
- [ ] 復旧時の通知も正常に動作する
- [ ] 通知遅延が5分以内である
- [ ] エラーが発生しない

### Test Commands
```bash
# アラーム発生テスト
aws cloudwatch set-alarm-state \
  --alarm-name "my-project-prod-sample-alarm" \
  --state-value ALARM \
  --state-reason "Testing Slack notification"

# 復旧テスト
aws cloudwatch set-alarm-state \
  --alarm-name "my-project-prod-sample-alarm" \
  --state-value OK \
  --state-reason "Test completed"
```

### Dependencies
- Issue #4 (Chatbot動作確認) が完了している必要がある

---

## Issue #6: 追加アラームとカスタマイズ

**Priority:** Low  
**Labels:** `enhancement`, `customization`  
**Assignee:** TBD  
**Estimated Time:** 2-3 hours

### Description
本格運用に向けて、実際の監視要件に合わせたCloudWatch Alarmの追加とカスタマイズを行う。

### Tasks
- [ ] 実際の監視対象メトリクスの特定
- [ ] 適切なしきい値の設定
- [ ] 複数アラームの追加
- [ ] メトリクスフィルターの設定（必要に応じて）
- [ ] 通知メッセージのカスタマイズ
- [ ] 複数チャンネルへの通知設定（必要に応じて）

### Acceptance Criteria
- [ ] 運用要件に合ったアラームが設定されている
- [ ] しきい値が適切に設定されている
- [ ] 通知メッセージが運用チームに分かりやすい
- [ ] 必要なチャンネルに通知が送信される

### Template Modification
CloudFormationテンプレートに追加リソースを定義：
```yaml
AdditionalAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    # カスタム設定
```

### Dependencies
- Issue #5 (アラームテスト) が完了している必要がある

---

## Issue #7: 運用監視とトラブルシューティング体制の確立

**Priority:** Medium  
**Labels:** `operations`, `monitoring`, `documentation`  
**Assignee:** TBD  
**Estimated Time:** 2-3 hours

### Description
システムの安定運用に向けて、監視体制とトラブルシューティング手順を確立する。

### Tasks
- [ ] CloudWatch Logsの監視設定
- [ ] AWS Chatbot自体のエラー監視
- [ ] 運用手順書の作成
- [ ] トラブルシューティングガイドの作成
- [ ] 障害時のエスカレーション手順定義
- [ ] 定期的なヘルスチェック手順の確立

### Acceptance Criteria
- [ ] システム全体の監視が設定されている
- [ ] 運用手順が文書化されている
- [ ] トラブルシューティング手順が明確である
- [ ] 担当者が手順を理解している
- [ ] 定期メンテナンス計画が作成されている

### Deliverables
- [ ] 運用手順書
- [ ] トラブルシューティングガイド
- [ ] 監視ダッシュボード（推奨）

### Dependencies
- すべての設定・テストタスク（Issue #1-#6）が完了している必要がある

---

## Epic Summary

**Total Estimated Time:** 8-13 hours  
**Priority Order:** Issue #1 → #2 → #3 → #4 → #5 → #6 → #7  

### Key Advantages of IaC Approach
✅ **バージョン管理** - すべての設定がコード化  
✅ **再現性** - 同じ環境を複数回作成可能  
✅ **自動化** - CI/CDパイプラインとの統合可能  
✅ **レビュー可能** - 設定変更をコードレビューで管理  
✅ **ロールバック** - 問題発生時の迅速な復旧  

### Prerequisites
- AWSアカウントとCloudFormation権限
- AWS CLI/SAM CLI環境
- Slackワークスペースアクセス権限
- Git環境（テンプレート管理用）

### Success Metrics
- CloudFormation Stackが正常にデプロイされる
- CloudWatch Alarmトリガー時に5分以内にSlack通知が届く
- システム可用性99.9%以上
- インフラ変更がすべてコード管理されている

### Rollback Plan
```bash
# 緊急時のスタック削除
aws cloudformation delete-stack --stack-name chatbot-notifications-stack
```