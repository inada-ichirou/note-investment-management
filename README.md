# Note投資管理自動化ツール

投資関連の記事を自動で作成、投稿、フォロー、いいねを行う自動化ツールです。

## 機能

- **autoCreateAndDraftNote.js**: 投資関連記事の自動作成と下書き保存
- **follow/followFromArticles.js**: 記事からユーザーを自動フォロー
- **likeUnlikedNotes.js**: 投資関連記事への自動いいね
- **autoPublishNotes.js**: 下書き記事の自動公開

## Renderでの定期実行設定

### 1. 環境変数の設定

Renderのダッシュボードで以下の環境変数を設定してください：

```
NOTE_EMAIL=your-email@example.com
NOTE_PASSWORD=your-password
```

### 2. スケジュール設定

現在の設定：6時間ごと（0, 6, 12, 18時）
- `render.yaml`の`schedule`を変更することで実行頻度を調整可能

### 3. 実行順序

1. autoCreateAndDraftNote.js - 記事作成
2. follow/followFromArticles.js - フォロー
3. likeUnlikedNotes.js - いいね
4. autoPublishNotes.js - 記事公開

## ローカル実行

```bash
# 全スクリプトを順次実行
npm start

# 個別実行
npm run create-draft
npm run follow
npm run like
npm run publish
```

## 注意事項

- 各スクリプト間に30秒の待機時間を設けてAPI制限を回避
- エラーが発生しても他のスクリプトは継続実行
- 実行結果はログで確認可能
