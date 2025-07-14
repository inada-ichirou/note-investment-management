# Fly.io用のDockerfile - Puppeteer対応版
FROM node:18-slim

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# アプリケーションのソースコードをコピー
COPY . .

# Puppeteerの依存関係をインストール（Fly.io環境での動作に必要な依存関係）
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libatspi2.0-0 \
    libxshmfence1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Puppeteerの環境変数を設定
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium"

# ポート8080を公開
EXPOSE 8080

# アプリケーションを起動
CMD ["npm", "start"] 
