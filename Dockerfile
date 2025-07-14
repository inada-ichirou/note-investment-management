# Fly.io用のDockerfile - Puppeteer安定動作版
FROM node:20.3.0-slim as base

# 必要なパッケージをインストール
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y \
        google-chrome-stable \
        fonts-ipafont-gothic \
        fonts-wqy-zenhei \
        fonts-thai-tlwg \
        fonts-khmeros \
        fonts-kacst \
        fonts-freefont-ttf \
        libxss1 \
        xvfb \
        dbus-x11 \
        libgtk-3-0 \
        libgbm1 \
        libasound2 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libxss1 \
        libxtst6 \
        libdrm2 \
        libxkbcommon0 \
        libatspi2.0-0 \
        libxshmfence1 \
        --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# PuppeteerのChromiumダウンロードをスキップ
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Fly.io環境用の環境変数
ENV DISPLAY=:99
ENV CHROME_BIN=/usr/bin/google-chrome-stable
ENV CHROME_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

# package.jsonをコピー
COPY package.json ./

# 依存関係をインストール
RUN npm install --production

# アプリケーションのソースコードをコピー
COPY . .

# ポート8080を公開
EXPOSE 8080

# 起動スクリプトを作成
RUN echo '#!/bin/bash
echo "=== 起動スクリプト開始 ==="
echo "Xvfbを起動中..."
Xvfb :99 -screen 0 1024x768x24 &
XVFB_PID=$!
sleep 2
if ps -p $XVFB_PID > /dev/null; then
  echo "Xvfb起動成功 (PID: $XVFB_PID)"
else
  echo "Xvfb起動失敗"
  exit 1
fi
echo "dbusを起動中..."
mkdir -p /var/run/dbus
dbus-daemon --system --fork
sleep 1
echo "DISPLAY=$DISPLAY"
echo "CHROME_BIN=$CHROME_BIN"
echo "CHROME_PATH=$CHROME_PATH"
echo "npm startを実行中..."
exec npm start' > /app/start.sh && chmod +x /app/start.sh

# アプリケーションを起動
CMD ["/app/start.sh"] 
