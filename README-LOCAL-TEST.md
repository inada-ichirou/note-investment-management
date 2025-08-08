# ローカルテスト手順

## 1. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
# OpenRouter AI API設定
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Note.com ログイン情報  
NOTE_EMAIL=your_note_email@example.com
NOTE_PASSWORD=your_note_password
```

## 2. サーバーの起動

```bash
npm run test-server
```

## 3. テスト方法

### ヘルスチェック
```bash
curl http://localhost:3000/health
```

### 記事作成・下書き保存（POST）
```bash
curl -X POST http://localhost:3000/api/v1/create_draft
```

### 記事作成・下書き保存（GET - テスト用）
ブラウザで以下のURLにアクセス：
```
http://localhost:3000/api/v1/create_draft
```

## 4. 確認ポイント

- ✅ サーバーが正常に起動する
- ✅ ヘルスチェックが成功する  
- ✅ AI記事生成が動作する
- ✅ Note.comログインが成功する
- ✅ 下書き保存が完了する

## 5. エラー対応

### よくあるエラー：

1. **OPENROUTER_API_KEY設定エラー**
   - `.env`ファイルでAPIキーを確認

2. **Note.comログインエラー**
   - メールアドレス・パスワードを確認
   - 2段階認証が有効な場合は無効化

3. **Puppeteerエラー**
   - Chromeブラウザがインストールされているか確認

## 6. ログ確認

サーバー実行中のコンソールで以下のログが表示されます：
- 🚀 サーバー起動メッセージ
- 📡 エンドポイント情報
- ⚡ リクエスト処理ログ
- ✅ 成功・エラーメッセージ
