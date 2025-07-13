# Note投資管理自動化ツール

Note.comでの投資関連記事の自動投稿・管理ツール

## 機能

- 投資記事の自動下書き作成
- フォロー機能の自動化
- いいね機能の自動化
- 記事の自動公開

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

- 環境変数（NOTE_EMAIL、NOTE_PASSWORD）の設定が必要です
- Puppeteerの動作に時間がかかる場合があります
- API制限に注意してください
