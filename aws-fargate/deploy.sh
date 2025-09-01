#!/bin/bash

# 設定
AWS_REGION="ap-northeast-1"
AWS_ACCOUNT_ID="848049622898"
ECR_REPOSITORY="note-automation"
ECS_CLUSTER="note-automation-cluster"
TASK_FAMILY="note-automation-task"

echo "🚀 AWS Fargate デプロイメントを開始します..."

# 1. ECRリポジトリの作成（存在しない場合）
echo "📦 ECRリポジトリを作成中..."
aws ecr create-repository \
  --repository-name $ECR_REPOSITORY \
  --image-scanning-configuration scanOnPush=true \
  --region $AWS_REGION 2>/dev/null || echo "リポジトリは既に存在します"

# 2. ECSクラスターの作成（存在しない場合）
echo "🏗️ ECSクラスターを作成中..."
aws ecs create-cluster \
  --cluster-name $ECS_CLUSTER \
  --region $AWS_REGION 2>/dev/null || echo "クラスターは既に存在します"

# 3. ECRにログイン
echo "🔐 ECRにログイン中..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# 4. Dockerイメージのビルド
echo "🐳 Dockerイメージをビルド中..."
docker build -t $ECR_REPOSITORY .

# 5. イメージにタグを付ける
echo "🏷️ イメージにタグを付ける中..."
docker tag $ECR_REPOSITORY:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# 6. ECRにプッシュ
echo "⬆️ ECRにイメージをプッシュ中..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# 7. タスク定義の登録
echo "📋 タスク定義を登録中..."
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION

echo "✅ デプロイメントが完了しました！"
echo ""
echo "次のステップ:"
echo "1. IAMロールの作成: ./create-iam-roles.sh"
echo "2. タスクの手動実行テスト: ./run-task.sh"
echo "3. EventBridgeルールの作成: ./create-schedule.sh"


