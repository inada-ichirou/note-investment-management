# Fly.io用のDockerfile - buildkite/puppeteerベースイメージ使用
FROM buildkite/puppeteer:latest

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonをコピー
COPY package.json ./

# 依存関係をインストール（npm ciではなくnpm installを使用）
RUN npm install --production

# アプリケーションのソースコードをコピー
COPY . .

# ポート8080を公開
EXPOSE 8080

# アプリケーションを起動
CMD ["npm", "start"] 
