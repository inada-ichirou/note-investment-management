# Note投資管理自動化ツール - 開発計画

## 概要
Note.comでの投資関連記事の自動投稿・管理ツールの開発計画

## 現在の状況（2025年7月24日）

### Vercel環境での問題と対応
- **問題**: `axios`モジュールが見つからないエラー
- **対応**: `node-fetch`に変更してESモジュール対応
- **状況**: 修正完了、テスト中

### easy-cronからの定期実行
- **simple-cron**: ✅ 成功（テスト用）
- **create-draft**: 🔄 テスト中（ESモジュールエラー修正後）

## 今後の対応方針

### Phase 1: create-draftの安定化（最優先）
1. **目標**: easy-cronからの`create-draft`定期実行を成功させる
2. **集中項目**: `api/create-draft.js`のみに注力
3. **確認項目**:
   - Vercel環境での正常動作
   - OpenRouter APIとの連携
   - エラーハンドリングの改善
   - ログ出力の確認

### Phase 2: 他の機能の定期実行化
1. **前提条件**: `create-draft`が安定動作するまで待機
2. **対象機能**:
   - `likeUnlikedNotes.js` - いいね機能
   - `follow/followFromArticles.js` - フォロー機能
   - `autoPublishNotes.js` - 記事公開機能
3. **実装順序**: 1つずつ段階的に追加

### Phase 3: 全体最適化
1. **エラー監視**: 全機能の安定性確認
2. **パフォーマンス**: 実行時間の最適化
3. **ログ管理**: 統合ログシステムの構築

## 機能一覧

### 1. 記事自動作成機能
- **ファイル**: `api/create-draft.js`
- **機能**: 投資関連記事の自動作成と下書き保存
- **実行頻度**: 毎日9時（easy-cron）
- **ステータス**: 🔄 テスト中（Phase 1）

### 2. フォロー機能
- **ファイル**: `follow/followFromArticles.js`
- **機能**: 記事からユーザーを自動フォロー
- **実行頻度**: 未設定
- **ステータス**: ⏳ 待機中（Phase 2）

### 3. いいね機能
- **ファイル**: `likeUnlikedNotes.js`
- **機能**: 投資関連記事への自動いいね
- **実行頻度**: 未設定
- **ステータス**: ⏳ 待機中（Phase 2）

### 4. 記事公開機能
- **ファイル**: `autoPublishNotes.js`
- **機能**: 下書き記事の自動公開
- **実行頻度**: 未設定
- **ステータス**: ⏳ 待機中（Phase 2）

## 技術スタック

- **言語**: Node.js (ES Modules)
- **ブラウザ自動化**: Puppeteer
- **HTTP通信**: node-fetch (v3.3.2)
- **Webフレームワーク**: Express.js
- **デプロイ**: Vercel
- **定期実行**: easy-cron

## 環境変数

```
OPENROUTER_API_KEY=sk-or-v1-...
NOTE_EMAIL=your-email@example.com
NOTE_PASSWORD=your-password
CRON_SECRET=1234567890
```

## 実行順序（予定）

1. `api/create-draft.js` - 記事作成（Phase 1）
2. `likeUnlikedNotes.js` - いいね（Phase 2）
3. `follow/followFromArticles.js` - フォロー（Phase 2）
4. `autoPublishNotes.js` - 記事公開（Phase 2）

## 注意事項

- **優先順位**: create-draftの安定化が最優先
- **段階的実装**: 1つの機能が安定してから次に進む
- **エラー監視**: Vercel Observabilityで継続監視
- **ログ確認**: 各実行後のログを必ず確認
