#!/bin/bash

# 設定
AWS_REGION="ap-northeast-1"
AWS_ACCOUNT_ID="848049622898"
ECR_REPOSITORY="note-automation"
ECS_CLUSTER="note-automation-cluster"
TASK_FAMILY="note-automation-task"
SUBNET_ID="subnet-053bd0dcbefb910e7"  # ap-northeast-1c のサブネット
SECURITY_GROUP_ID="sg-04a90ba307c10189e"  # default セキュリティグループ

echo "🚀 タスクを実行中..."

# タスクを実行
TASK_ARN=$(aws ecs run-task \
  --cluster $ECS_CLUSTER \
  --task-definition $TASK_FAMILY \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
  --region $AWS_REGION \
  --query 'tasks[0].taskArn' \
  --output text)

echo "✅ タスクが開始されました: $TASK_ARN"
echo ""
echo "タスクの状態を確認するには:"
echo "aws ecs describe-tasks --cluster $ECS_CLUSTER --tasks $TASK_ARN --region $AWS_REGION"
echo ""
echo "ログを確認するには:"
echo "aws logs tail /ecs/note-automation --follow --region $AWS_REGION"

