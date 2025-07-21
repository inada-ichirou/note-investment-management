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

## 環境変数設定

### 必要な環境変数

1. **OPENROUTER_API_KEY**: OpenRouter APIのキー
2. **NOTE_EMAIL**: Note.comのメールアドレス
3. **NOTE_PASSWORD**: Note.comのパスワード
4. **CRON_SECRET**: 定期実行用の認証シークレット

### Vercelでの設定方法

1. Vercelダッシュボードにアクセス
2. プロジェクト設定 → Environment Variables
3. 上記の環境変数を追加

### ローカル開発

`.env`ファイルを作成して環境変数を設定：

```bash
OPENROUTER_API_KEY=your_api_key_here
NOTE_EMAIL=your_email@example.com
NOTE_PASSWORD=your_password_here
CRON_SECRET=your_secret_here
```

## 注意事項

- **重要**: 環境変数は絶対にGitHubにプッシュしないでください
- `.env`ファイルは`.gitignore`に含まれています
- Vercelの無料枠では月100GB-Hrsまで
- Puppeteerの動作に時間がかかる場合があります
- API制限に注意してください
