# AWS Chatbot CloudFormation Deployment Guide

## 事前準備

### 1. Slack Workspace IDとChannel IDの取得

#### Slack Workspace ID の取得方法
1. SlackのWebブラウザ版にアクセス
2. URLから取得: `https://app.slack.com/client/T0XXXXXXXXX/...`
3. `T0XXXXXXXXX` の部分がWorkspace ID

#### Slack Channel ID の取得方法
1. Slackで対象チャンネルを開く
2. チャンネル名をクリックして詳細を表示
3. 一番下の「インテグレーション」タブをクリック
4. Channel IDが表示される（C0XXXXXXXXX形式）

### 2. AWS CLI/SAM CLIのセットアップ
```bash
# AWS CLI設定
aws configure

# SAM CLIインストール確認
sam --version
```

## デプロイ手順

### 1. パラメータファイルの作成
```bash
# parameters.json を作成
cat > parameters.json << EOF
[
  {
    "ParameterKey": "SlackWorkspaceId",
    "ParameterValue": "T0XXXXXXXXX"
  },
  {
    "ParameterKey": "SlackChannelId",
    "ParameterValue": "C0XXXXXXXXX"
  },
  {
    "ParameterKey": "SlackChannelName",
    "ParameterValue": "aws-alerts"
  },
  {
    "ParameterKey": "ProjectName",
    "ParameterValue": "my-project"
  },
  {
    "ParameterKey": "Environment",
    "ParameterValue": "prod"
  }
]
EOF
```

### 2. CloudFormation Stack のデプロイ

#### AWS CLI使用
```bash
aws cloudformation create-stack \
  --stack-name chatbot-notifications-stack \
  --template-body file://chatbot-template.yml \
  --parameters file://parameters.json \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

#### SAM CLI使用
```bash
# SAM buildは不要（Serverless関数がないため）
sam deploy \
  --template-file chatbot-template.yml \
  --stack-name chatbot-notifications-stack \
  --parameter-overrides file://parameters.json \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### 3. デプロイ状況の確認
```bash
# スタック作成状況確認
aws cloudformation describe-stacks \
  --stack-name chatbot-notifications-stack \
  --query 'Stacks[0].StackStatus'

# リソース一覧確認
aws cloudformation list-stack-resources \
  --stack-name chatbot-notifications-stack
```

## 設定確認とテスト

### 1. AWS Chatbot設定確認
```bash
# Chatbot設定一覧
aws chatbot describe-slack-channel-configurations

# SNSトピック確認
aws sns list-topics | grep cloudwatch-alarms
```

### 2. テスト通知の送信
```bash
# CloudWatch Alarmを手動でトリガー
aws cloudwatch set-alarm-state \
  --alarm-name "my-project-prod-sample-alarm" \
  --state-value ALARM \
  --state-reason "Testing Slack notification"

# アラーム状態を元に戻す
aws cloudwatch set-alarm-state \
  --alarm-name "my-project-prod-sample-alarm" \
  --state-value OK \
  --state-reason "Test completed"
```

## カスタマイズ

### 1. 複数のアラーム追加
template.ymlに追加のCloudWatch Alarmリソースを定義：

```yaml
AdditionalAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub '${ProjectName}-${Environment}-custom-alarm'
    # ... 他のプロパティ
```

### 2. 複数チャンネルへの通知
複数のSlackChannelConfigurationリソースを作成：

```yaml
SecondSlackChannelConfiguration:
  Type: AWS::Chatbot::SlackChannelConfiguration
  Properties:
    ConfigurationName: !Sub '${ProjectName}-${Environment}-slack-config-2'
    SlackChannelId: !Ref SecondSlackChannelId
    # ... 他のプロパティ
```

### 3. カスタムメトリクスの監視
Parametersセクションでメトリクス設定をカスタマイズ可能

## トラブルシューティング

### よくあるエラー
1. **InvalidParameterValue: Invalid workspace ID**
   - Slack Workspace IDの形式を確認（T0XXXXXXXXX）

2. **InvalidParameterValue: Invalid channel ID**
   - Slack Channel IDの形式を確認（C0XXXXXXXXX）

3. **AccessDenied: User is not authorized**
   - AWS IAM権限を確認
   - Slackワークスペースの管理者権限を確認

### ログ確認
```bash
# CloudWatch Logsでエラー確認
aws logs describe-log-groups --log-group-name-prefix "/aws/chatbot/"

# 最近のログエントリを確認
aws logs describe-log-streams \
  --log-group-name "/aws/chatbot/my-project-prod" \
  --order-by LastEventTime \
  --descending
```

## クリーンアップ

```bash
# スタック削除
aws cloudformation delete-stack \
  --stack-name chatbot-notifications-stack

# 削除完了確認
aws cloudformation wait stack-delete-complete \
  --stack-name chatbot-notifications-stack
```

## セキュリティ考慮事項

1. **最小権限の原則**
   - IAMロールは必要最小限の権限のみ付与

2. **リソースベースのポリシー**
   - SNSトピックへのアクセス制御

3. **ログ監視**
   - CloudWatch Logsでの活動監視

4. **定期的なレビュー**
   - 権限とリソースの定期見直し