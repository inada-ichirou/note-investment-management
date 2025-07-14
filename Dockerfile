# Fly.io用のDockerfile - Will Schenkの記事を参考にGoogle Chromeを直接インストール
FROM --platform=linux/amd64 debian:bookworm-slim

RUN apt-get update

# Node.jsとnpmをインストール
RUN apt-get install -y nodejs npm

# Google Chromeと依存関係をインストール
RUN apt-get install -y wget gpg
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update
RUN apt-get install -y google-chrome-stable fonts-freefont-ttf libxss1 \
    --no-install-recommends

# PuppeteerのChromiumダウンロードをスキップ
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# package.jsonをコピー
COPY package.json ./

# 依存関係をインストール
RUN npm install --production

# アプリケーションのソースコードをコピー
COPY . .

# ポート8080を公開
EXPOSE 8080

# アプリケーションを起動
CMD ["npm", "start"] 
