// 下書きを公開するAPIエンドポイント
import puppeteer from 'puppeteer-core';
import fs from 'fs';

export default async function handler(req, res) {
  // GETとPOSTリクエストを許可
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== Publish Notes API 実行開始 ===');
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
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--window-size=1280,900'
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

    // 下書き一覧ページに移動
    const draftUrl = 'https://note.com/notes?page=1&status=draft';
    console.log('下書き一覧ページへ遷移:', draftUrl);
    
    await page.goto(draftUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('下書き一覧ページに到達');

    // ページ読み込み完了を待機
    await new Promise(resolve => setTimeout(resolve, 3000));

    // JavaScriptによる動的読み込みを待機
    try {
      await page.waitForFunction(
        () => {
          const readyState = document.readyState;
          const hasContent = document.body && document.body.innerHTML.length > 100000;
          return readyState === 'complete' && hasContent;
        },
        { timeout: 10000 }
      );
      console.log('ページの動的読み込みが完了');
    } catch (e) {
      console.log('動的読み込みの待機がタイムアウト:', e.message);
    }

    // 追加の待機時間
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 下書き記事の一覧を取得
    const draftArticles = await page.evaluate(() => {
      const articleElements = document.querySelectorAll('a[href*="/n/"]');
      return Array.from(articleElements, (el, index) => ({
        href: el.href,
        title: el.textContent?.trim() || `下書き${index + 1}`,
        index
      })).slice(0, 5); // 最初の5記事のみ
    });

    console.log(`下書き記事数: ${draftArticles.length}`);

    let publishedCount = 0;
    const maxPublishes = 3; // 最大公開数

    for (const article of draftArticles) {
      if (publishedCount >= maxPublishes) break;

      try {
        console.log(`記事を開いています: ${article.title}`);
        await page.goto(article.href, { waitUntil: 'networkidle2' });
        
        // 編集ボタンを探してクリック
        const editButton = await page.$('button[data-testid="edit-button"], .edit-button, button:contains("編集")');
        if (editButton) {
          await editButton.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2' });
          
          // 公開ボタンを探してクリック
          const publishButton = await page.$('button[data-testid="publish-button"], .publish-button, button:contains("公開")');
          if (publishButton) {
            await publishButton.click();
            
            // 公開確認ダイアログの処理
            try {
              const confirmButton = await page.$('button:contains("公開する"), button[data-testid="confirm-publish"]');
              if (confirmButton) {
                await confirmButton.click();
                publishedCount++;
                console.log(`公開成功: ${article.title}`);
                
                // 少し待機
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            } catch (dialogError) {
              console.log(`公開確認ダイアログエラー: ${article.title}`, dialogError.message);
            }
          }
        }
      } catch (error) {
        console.log(`記事処理エラー: ${article.title}`, error.message);
      }
    }

    await browser.close();

    const result = {
      success: true,
      message: 'Publish notes execution completed',
      timestamp: new Date().toISOString(),
      method: req.method,
      publishedCount: publishedCount,
      maxPublishes: maxPublishes,
      totalDrafts: draftArticles.length,
      environment: 'Vercel Functions'
    };

    console.log('=== Publish Notes API 実行完了 ===');
    console.log('結果:', JSON.stringify(result, null, 2));
    res.status(200).json(result);

  } catch (error) {
    console.error('Publish Notes API 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method
    });
  }
} 
