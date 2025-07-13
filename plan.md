# Note投資管理自動化ツール - 開発計画

## 概要
Note.comでの投資関連記事の自動投稿・管理ツールの開発計画

## 機能一覧

### 1. 記事自動作成機能
- **ファイル**: `autoCreateAndDraftNote.js`
- **機能**: 投資関連記事の自動作成と下書き保存
- **実行頻度**: 6時間ごと
- **ステータス**: ✅ 実装済み

### 2. フォロー機能
- **ファイル**: `follow/followFromArticles.js`
- **機能**: 記事からユーザーを自動フォロー
- **実行頻度**: 6時間ごと
- **ステータス**: ✅ 実装済み

### 3. いいね機能
- **ファイル**: `likeUnlikedNotes.js`
- **機能**: 投資関連記事への自動いいね
- **実行頻度**: 6時間ごと
- **ステータス**: ✅ 実装済み

### 4. 記事公開機能
- **ファイル**: `autoPublishNotes.js`
- **機能**: 下書き記事の自動公開
- **実行頻度**: 6時間ごと
- **ステータス**: ✅ 実装済み

## 技術スタック

- **言語**: Node.js
- **ブラウザ自動化**: Puppeteer
- **HTTP通信**: Axios
- **Webフレームワーク**: Express.js

## 環境変数

```
NOTE_EMAIL=your-email@example.com
NOTE_PASSWORD=your-password
```

## 実行順序

1. `autoCreateAndDraftNote.js` - 記事作成
2. `follow/followFromArticles.js` - フォロー
3. `likeUnlikedNotes.js` - いいね
4. `autoPublishNotes.js` - 記事公開

## 注意事項

- 各スクリプト間に30秒の待機時間を設けてAPI制限を回避
- エラーが発生しても他のスクリプトは継続実行
- 実行結果はログで確認可能
