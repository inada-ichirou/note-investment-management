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
RUN echo '#!/bin/bash\n\
# Xvfbをバックグラウンドで起動\n\
Xvfb :99 -screen 0 1024x768x24 &\n\
# dbusを起動\n\
mkdir -p /var/run/dbus\n\
dbus-daemon --system --fork\n\
# アプリケーションを起動\n\
exec npm start' > /app/start.sh \
    && chmod +x /app/start.sh

# アプリケーションを起動
CMD ["/app/start.sh"] 
