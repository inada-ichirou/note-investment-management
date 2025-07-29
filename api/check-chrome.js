// Puppeteer Chromeパス確認専用エンドポイント
import fs from 'fs';
import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  console.log('=== Chrome Path Check API 実行開始 ===');
  console.log('実行時刻:', new Date().toISOString());

  try {
    const isVercel = process.env.VERCEL === '1';
    const isPipedream = process.env.PIPEDREAM === '1' || process.env.PIPEDREAM_RUNTIME_ID;
    
    console.log('環境情報:');
    console.log('- isVercel:', isVercel);
    console.log('- isPipedream:', isPipedream);
    console.log('- VERCEL:', process.env.VERCEL);
    console.log('- PIPEDREAM:', process.env.PIPEDREAM);
    console.log('- PIPEDREAM_RUNTIME_ID:', process.env.PIPEDREAM_RUNTIME_ID);

    // 確認するChromeパスのリスト
    const possiblePaths = [
      '/vercel/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/opt/google/chrome/chrome',
      '/opt/google/chrome-stable/chrome',
      '/usr/bin/google-chrome-stable',
      '/snap/bin/chromium',
      '/usr/bin/chrome',
      '/usr/bin/chrome-browser'
    ];

    console.log('Chromeパス確認開始...');
    const pathResults = [];
    
    for (const path of possiblePaths) {
      const exists = fs.existsSync(path);
      pathResults.push({ path, exists });
      console.log(`パス確認: ${path} - 存在: ${exists}`);
    }

    // 存在するパスをフィルタ
    const existingPaths = pathResults.filter(result => result.exists);
    console.log('存在するパス:', existingPaths);

    // Puppeteer起動テスト
    let puppeteerTest = null;
    if (existingPaths.length > 0) {
      const testPath = existingPaths[0].path;
      console.log(`Puppeteer起動テスト開始: ${testPath}`);
      
      try {
        const launchOptions = {
          headless: true,
          executablePath: testPath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--disable-extensions'
          ],
          timeout: 30000
        };

        const browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();
        await page.goto('https://example.com');
        const title = await page.title();
        await browser.close();

        puppeteerTest = {
          success: true,
          path: testPath,
          title: title
        };
        console.log('Puppeteer起動テスト成功:', puppeteerTest);
      } catch (error) {
        puppeteerTest = {
          success: false,
          path: testPath,
          error: error.message
        };
        console.error('Puppeteer起動テスト失敗:', error.message);
      }
    } else {
      console.log('存在するChromeパスが見つからないため、Puppeteerテストをスキップ');
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        isVercel,
        isPipedream,
        VERCEL: process.env.VERCEL,
        PIPEDREAM: process.env.PIPEDREAM,
        PIPEDREAM_RUNTIME_ID: process.env.PIPEDREAM_RUNTIME_ID
      },
      pathCheck: pathResults,
      existingPaths: existingPaths.map(p => p.path),
      puppeteerTest
    };

    console.log('=== Chrome Path Check API 実行完了 ===');
    console.log('結果:', JSON.stringify(result, null, 2));
    res.status(200).json(result);

  } catch (error) {
    console.error('Chrome Path Check API 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method
    });
  }
} 
