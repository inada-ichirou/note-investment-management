# AWS Fargate での Note Automation 実装

このディレクトリには、AWS FargateでPuppeteerを使用した自動化を定期実行するための設定ファイルが含まれています。

## 🎯 要件

- Puppeteerを使用した自動Web操作
- 1回の実行が約8分
- 1日3回の定期実行（8時間ごと）
- クラッシュ時の再起動やエラーハンドリング

## 🏗️ アーキテクチャ

```
EventBridge (8時間ごと) → ECS Fargate → Docker Container (Puppeteer)
                                    ↓
                              CloudWatch Logs
```

## 📋 実装手順

### 1. 前提条件の確認

AWS CLIが設定済みであることを確認：
```bash
aws sts get-caller-identity
```

### 2. IAMロールの作成

```bash
chmod +x create-iam-roles.sh
./create-iam-roles.sh
```

### 3. デプロイメント

```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. ネットワーク設定の確認

VPC、サブネット、セキュリティグループのIDを確認し、以下のファイルを編集：
- `run-task.sh`
- `create-schedule.sh`

### 5. 手動実行テスト

```bash
chmod +x run-task.sh
./run-task.sh
```

### 6. 定期実行の設定

```bash
chmod +x create-schedule.sh
./create-schedule.sh
```

## 🔧 設定ファイルの説明

### task-definition.json
- ECSタスクの定義（CPU、メモリ、環境変数など）
- Puppeteer用の設定が含まれている

### Dockerfile
- Node.js 18 + Chromium + 日本語フォント
- Puppeteerの実行環境を構築

## 📊 監視とログ

### CloudWatch Logs
- ロググループ: `/ecs/note-automation`
- リアルタイムログ確認:
```bash
aws logs tail /ecs/note-automation --follow --region ap-northeast-1
```

### タスク状態の確認
```bash
aws ecs describe-tasks --cluster note-automation-cluster --tasks <TASK_ARN> --region ap-northeast-1
```

## 💰 コスト最適化

- タスク完了後に自動停止
- 1日3回の実行のみ
- スポットインスタンスの利用も可能

## 🚨 トラブルシューティング

### よくある問題

1. **IAMロールの権限不足**
   - ロールが正しく作成されているか確認
   - ポリシーが適切にアタッチされているか確認

2. **ネットワーク設定の問題**
   - サブネットIDとセキュリティグループIDが正しいか確認
   - パブリックIPの割り当てが有効になっているか確認

3. **Dockerイメージのビルドエラー**
   - ローカルでDockerビルドが成功するか確認
   - ECRへのプッシュ権限があるか確認

### ログの確認方法

```bash
# タスクの詳細情報
aws ecs describe-tasks --cluster note-automation-cluster --region ap-northeast-1

# CloudWatchログ
aws logs describe-log-groups --log-group-name-prefix /ecs/note-automation --region ap-northeast-1
```

## 🔄 更新手順

コードを更新した場合：

1. 新しいDockerイメージをビルド
2. ECRにプッシュ
3. タスク定義を更新
4. 必要に応じてタスクを再起動

```bash
./deploy.sh
```

## 📚 参考資料

- [AWS ECS Fargate ドキュメント](https://docs.aws.amazon.com/ecs/latest/userguide/what-is-fargate.html)
- [AWS EventBridge ドキュメント](https://docs.aws.amazon.com/eventbridge/latest/userguide/)
- [AWS CloudWatch Logs ドキュメント](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/)


