# デプロイ・定期実行設定ガイド

## 選択肢と特徴

### 1. GitHub Actions（推奨）⭐⭐⭐⭐⭐

**タイムアウト：** 最大6時間
**料金：** 無料（月2,000分まで）
**セットアップ：** `.github/workflows/`にファイル配置のみ

#### セットアップ手順：
1. GitHubリポジトリのSettings → Secrets → Actions
2. 以下のシークレットを設定：
   - `OPENROUTER_API_KEY`
   - `NOTE_EMAIL` 
   - `NOTE_PASSWORD`
3. `.github/workflows/`内のymlファイルがあれば自動実行開始

### 2. Render Cron Jobs ⭐⭐⭐⭐

**タイムアウト：** 30分
**料金：** 無料枠あり
**セットアップ：** Webダッシュボードで設定

#### セットアップ手順：
1. [Render](https://render.com)でアカウント作成
2. GitHubリポジトリを接続
3. `render-cron.yaml`の設定に従ってCron Jobを作成
4. 環境変数を設定

### 3. Railway ⭐⭐⭐

**タイムアウト：** 15分
**料金：** 使用量課金
**セットアップ：** CLI または Web

#### セットアップ手順：
```bash
# Railway CLIインストール
npm install -g @railway/cli

# ログイン
railway login

# プロジェクト作成
railway init

# デプロイ
railway up

# Cron設定
railway cron add "0 */3 * * *" "node autoCreateAndDraftNote.js"
```

### 4. 自前サーバー + cron ⭐⭐

**タイムアウト：** 無制限
**料金：** サーバー代
**セットアップ：** 複雑

#### セットアップ例：
```bash
# VPS（Ubuntu）での設定例
sudo apt update
sudo apt install nodejs npm

# プロジェクトクローン
git clone https://github.com/your-username/note-investment-management.git
cd note-investment-management
npm install

# 環境変数設定
cp .env.example .env
# .envファイルを編集

# cronタブ設定
crontab -e
# 以下を追加：
# 0 */3 * * * cd /path/to/note-investment-management && node autoCreateAndDraftNote.js
```

## タイムアウト対策

### 現在の処理時間：
- AI記事生成：30-60秒
- Puppeteer起動：30秒（タイムアウト設定）
- Note.comログイン：10-30秒
- 下書き保存：10-20秒
- **合計：約2-3分**

### 推奨サービス選択基準：

| 処理時間 | 推奨サービス |
|---|---|
| 2-3分 | すべてOK |
| 5-10分 | GitHub Actions, Render |
| 10-30分 | GitHub Actions |
| 30分以上 | 自前サーバー |

## 現在の状況での推奨

あなたの場合、処理時間は**2-3分程度**なので：

1. **GitHub Actions が使える場合** → GitHub Actions
2. **GitHub Actions が使えない場合** → Render Cron Jobs
3. **無料枠を使い切った場合** → Railway

どのサービスでも十分に動作するはずです。
