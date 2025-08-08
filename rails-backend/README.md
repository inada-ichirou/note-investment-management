# Note自動化バックエンド

`autoCreateAndDraftNote.js`の機能をRailsのAPIエンドポイントとして実装したバックエンドです。

## 機能

- AI記事自動生成（OpenRouter API使用）
- Note.comへの下書き自動保存
- RESTful APIエンドポイント

## セットアップ

### 1. 依存関係のインストール
```bash
cd rails-backend
bundle install
```

### 2. 環境変数の設定
`.env`ファイルを作成し、以下の環境変数を設定：

```env
OPENROUTER_API_KEY=your_openrouter_api_key
NOTE_EMAIL=your_note_email
NOTE_PASSWORD=your_note_password
DATABASE_URL=your_database_url_for_production
```

### 3. データベースセットアップ
```bash
rails db:create
rails db:migrate
```

### 4. ローカル実行
```bash
rails server -p 3000
```

## APIエンドポイント

### 記事作成・下書き保存
```bash
POST /api/v1/create_draft
```

**レスポンス例:**
```json
{
  "status": "success",
  "message": "Note記事の下書き作成が完了しました",
  "data": {
    "draft_id": 12345,
    "title": "投資初心者向けガイド",
    "topic": "投資初心者向けガイド",
    "pattern": "ランキング-トップ5",
    "content_length": 1234,
    "timestamp": "2025-01-17T10:30:00Z"
  }
}
```

### ヘルスチェック
```bash
GET /api/v1/health_check
```

## デプロイ

### Renderでのデプロイ

1. GitHubにプッシュ
2. Renderのダッシュボードで新しいWebサービスを作成
3. `render.yaml`が自動で設定を読み込み
4. 環境変数を設定

### 定期実行の設定

Renderの`render.yaml`で定期実行ジョブも自動設定されます：

```yaml
# 3時間ごとに記事作成
- type: cron
  name: create-draft-job
  schedule: "0 */3 * * *"
  buildCommand: bundle install
  startCommand: curl -X POST https://your-app.onrender.com/api/v1/create_draft
```

## 使用技術

- Ruby on Rails 7.0 (API専用)
- PostgreSQL
- Mechanize (スクレイピング)
- Faraday (HTTP通信)
- OpenRouter API (AI記事生成)

## 元のJavaScriptコードとの対応

| JavaScript機能 | Rails実装 |
|---|---|
| `generateArticle()` | `AiArticleService.generate_article` |
| `rewriteAndTagArticle()` | `AiArticleService.rewrite_and_tag_article` |
| Puppeteerでのnote操作 | `NoteService` (Mechanize使用) |
| `main()` | `Api::V1::AutomationController#create_draft` |
