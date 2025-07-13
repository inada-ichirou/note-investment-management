# Note投資管理自動化ツール

Note.comでの投資関連記事の自動投稿・管理ツール

## 機能

- 投資記事の自動下書き作成
- フォロー機能の自動化
- いいね機能の自動化
- 記事の自動公開

## Fly.ioでのデプロイ手順

### 1. Fly.ioアカウント作成
1. [Fly.io](https://fly.io) にアクセス
2. GitHubアカウントでサインアップ
3. クレジットカード登録（無料枠利用のため）

### 2. Fly.io CLIツールインストール
```bash
# macOS
brew install flyctl

# Windows/Linux
# https://fly.io/docs/hands-on/install-flyctl/ を参照
```

### 3. Fly.ioにログイン
```bash
flyctl auth login
```

### 4. プロジェクト初期化
```bash
flyctl launch
```

### 5. 環境変数設定
```bash
flyctl secrets set NOTE_EMAIL=your-email@example.com
flyctl secrets set NOTE_PASSWORD=your-password
flyctl secrets set NODE_ENV=production
```

### 6. デプロイ
```bash
flyctl deploy
```

### 7. 動作確認
```bash
flyctl open
```

### 8. APIエンドポイント
デプロイ後、以下のエンドポイントが利用可能：

- `GET /` - ヘルスチェック
- `GET /create-draft` - 下書き作成
- `GET /follow` - フォロー実行
- `GET /like` - いいね実行
- `GET /publish` - 記事公開

### 9. 定期実行設定
外部スケジューラー（cron-job.org等）で以下のURLを定期実行：

```
https://your-app-name.fly.dev/create-draft
https://your-app-name.fly.dev/follow
https://your-app-name.fly.dev/like
https://your-app-name.fly.dev/publish
```

## ローカル開発

```bash
npm install
npm start
```

## 個別実行

```bash
# 下書き作成
npm run create-draft

# フォロー実行
npm run follow

# いいね実行
npm run like

# 記事公開
npm run publish
```

## 注意事項

- Fly.ioの無料枠では月間3つのアプリ、3GB RAMまで
- クレジットカード登録が必要です
- 環境変数は必ず設定してください
- Puppeteerの動作に時間がかかる場合があります
- API制限に注意してください
