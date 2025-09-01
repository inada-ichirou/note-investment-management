FROM --platform=linux/amd64 node:18-slim

# 日本語フォントとChrome関連パッケージのインストール
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-ipafont-mincho \
    wget \
    gnupg \
    ca-certificates \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係のインストールと確認
RUN npm install && \
    echo "Node version: $(node --version)" && \
    echo "NPM version: $(npm --version)"

# アプリケーションファイルをコピー
COPY . .

# 環境変数の設定
ENV PORT=8080
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# デバッグ用の環境変数
ENV DEBUG=express:*

# Chrome関連の設定
RUN mkdir -p /home/pptruser && \
    groupadd -r pptruser && \
    useradd -r -g pptruser -G audio,video pptruser && \
    chown -R pptruser:pptruser /home/pptruser && \
    chown -R pptruser:pptruser /app

# アプリケーションディレクトリの確認
RUN ls -la /app && \
    echo "Current directory contents:" && \
    ls -la

USER pptruser
EXPOSE 8080

# Node.jsをデバッグモードで起動
CMD ["node", "--trace-warnings", "server.js"]
