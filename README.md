# Note投資管理自動化ツール

Note.comでの投資関連記事の自動投稿・管理ツール

## 機能

- 投資記事の自動下書き作成
- フォロー機能の自動化
- いいね機能の自動化
- 記事の自動公開

## Cyclic.shでのデプロイ手順

### 1. Cyclic.shアカウント作成
1. [Cyclic.sh](https://cyclic.sh) にアクセス
2. GitHubアカウントでサインアップ

### 2. プロジェクト接続
1. Cyclic.shダッシュボードで「Link Your Own」を選択
2. GitHubリポジトリを選択
3. ブランチを選択（mainまたはmaster）

### 3. 環境変数設定
Cyclic.shダッシュボードで以下の環境変数を設定：

```
NOTE_EMAIL=your-email@example.com
NOTE_PASSWORD=your-password
NODE_ENV=production
```

### 4. デプロイ
- 自動的にデプロイが開始されます
- ビルドログでエラーがないことを確認

### 5. APIエンドポイント
デプロイ後、以下のエンドポイントが利用可能：

- `GET /` - ヘルスチェック
- `GET /create-draft` - 下書き作成
- `GET /follow` - フォロー実行
- `GET /like` - いいね実行
- `GET /publish` - 記事公開

### 6. 定期実行設定
外部スケジューラー（cron-job.org等）で以下のURLを定期実行：

```
https://your-app-name.cyclic.app/create-draft
https://your-app-name.cyclic.app/follow
https://your-app-name.cyclic.app/like
https://your-app-name.cyclic.app/publish
```

## ローカル開発

```bash
npm install
npm start
```

## 注意事項

- Cyclic.shの無料枠では月間実行時間に制限があります
- 環境変数は必ず設定してください
- Puppeteerの動作に時間がかかる場合があります
