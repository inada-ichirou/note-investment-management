#!/bin/bash

# 設定
AWS_REGION="ap-northeast-1"
AWS_ACCOUNT_ID="848049622898"
ECS_CLUSTER="note-automation-cluster"
TASK_FAMILY="note-automation-task"
SUBNET_ID="subnet-053bd0dcbefb910e7"  # ap-northeast-1c のサブネット
SECURITY_GROUP_ID="sg-04a90ba307c10189e"  # default セキュリティグループ

echo "⏰ 定期実行スケジュールを作成中..."

# EventBridgeルールの作成
RULE_ARN=$(aws events put-rule \
  --name "note-automation-schedule" \
  --schedule-expression "rate(8 hours)" \
  --description "Note automation task - 8時間ごとに実行" \
  --region $AWS_REGION \
  --query 'RuleArn' \
  --output text)

echo "✅ EventBridgeルールが作成されました: $RULE_ARN"

# ECSタスク実行用のターゲットを作成
aws events put-targets \
  --rule "note-automation-schedule" \
  --targets "Id"="1","Arn"="arn:aws:ecs:$AWS_REGION:$AWS_ACCOUNT_ID:cluster/$ECS_CLUSTER","RoleArn"="arn:aws:iam::$AWS_ACCOUNT_ID:role/note-automation-task-role","EcsParameters"="{\"TaskDefinitionArn\":\"arn:aws:ecs:$AWS_REGION:$AWS_ACCOUNT_ID:task-definition/$TASK_FAMILY\",\"TaskCount\":1,\"LaunchType\":\"FARGATE\",\"NetworkConfiguration\":{\"awsvpcConfiguration\":{\"Subnets\":[\"$SUBNET_ID\"],\"SecurityGroups\":[\"$SECURITY_GROUP_ID\"],\"AssignPublicIp\":\"ENABLED\"}}}}" \
  --region $AWS_REGION

echo "✅ ターゲットが設定されました"
echo ""
echo "定期実行の設定が完了しました！"
echo "タスクは8時間ごとに自動実行されます。"
echo ""
echo "ルールの詳細を確認するには:"
echo "aws events describe-rule --name note-automation-schedule --region $AWS_REGION"

