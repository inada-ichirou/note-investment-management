// 記事からフォローするAPIエンドポイント
import puppeteer from 'puppeteer-core';
import fs from 'fs';

export default async function handler(req, res) {
  // GETとPOSTリクエストを許可
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== Follow Articles API 実行開始 ===');
  console.log('Method:', req.method);
  console.log('実行時刻:', new Date().toISOString());

  try {
    // 環境変数チェック
    if (!process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
      throw new Error('NOTE_EMAIL or NOTE_PASSWORD is not set');
    }

    // Chromeパスの検出
    const chromePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/opt/homebrew/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];

    let executablePath = null;
    for (const path of chromePaths) {
      if (fs.existsSync(path)) {
        executablePath = path;
        break;
      }
    }

    // Puppeteer起動
    const browser = await puppeteer.launch({
      executablePath: executablePath || process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--window-size=1280,800',
        '--remote-debugging-port=9222',
        '--disable-dev-tools',
        '--disable-infobars',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-domain-reliability',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--metrics-recording-only',
        '--safebrowsing-disable-auto-update',
        '--password-store=basic',
        '--use-mock-keychain',
        '--lang=ja-JP',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      timeout: 60000
    });

    const page = await browser.newPage();
    
    // User-Agent設定
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    // note.comにログイン
    console.log('note.comにログイン中...');
    await page.goto('https://note.com/login', { waitUntil: 'networkidle2' });
    
    await page.type('input[name="email"]', process.env.NOTE_EMAIL);
    await page.type('input[name="password"]', process.env.NOTE_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ログイン完了を待機
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('ログイン完了');

    // はじめてのnoteページに移動
    await page.goto('https://note.com/notes?page=1&status=public', { waitUntil: 'networkidle2' });
    
    // 記事一覧を取得
    const articles = await page.evaluate(() => {
      const articleElements = document.querySelectorAll('a[href*="/n/"]');
      return Array.from(articleElements, (el, index) => ({
        href: el.href,
        title: el.textContent?.trim() || `記事${index + 1}`,
        index
      })).slice(0, 10); // 最初の10記事のみ
    });

    let followCount = 0;
    const maxFollows = 5; // 最大フォロー数

    for (const article of articles) {
      if (followCount >= maxFollows) break;

      try {
        console.log(`記事を開いています: ${article.title}`);
        await page.goto(article.href, { waitUntil: 'networkidle2' });
        
        // フォローボタンを探してクリック
        const followButton = await page.$('button[data-testid="follow-button"], .follow-button, button:contains("フォロー")');
        if (followButton) {
          await followButton.click();
          followCount++;
          console.log(`フォロー成功: ${article.title}`);
          
          // 少し待機
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.log(`記事処理エラー: ${article.title}`, error.message);
      }
    }

    await browser.close();

    const result = {
      success: true,
      message: 'Follow articles execution completed',
      timestamp: new Date().toISOString(),
      method: req.method,
      followsCompleted: followCount,
      maxFollows: maxFollows,
      environment: 'Vercel Functions'
    };

    console.log('=== Follow Articles API 実行完了 ===');
    console.log('結果:', JSON.stringify(result, null, 2));
    res.status(200).json(result);

  } catch (error) {
    console.error('Follow Articles API 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method
    });
  }
} 
