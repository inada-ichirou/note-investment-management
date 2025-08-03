// Chromeパス確認専用エンドポイント（シンプル版）
import fs from 'fs';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  console.log('=== Chrome Path Check Simple 実行開始 ===');
  console.log('実行時刻:', new Date().toISOString());

  try {
    const isVercel = process.env.VERCEL === '1';
    
    console.log('環境情報:');
    console.log('- isVercel:', isVercel);
    console.log('- VERCEL:', process.env.VERCEL);

    // 確認するChromeパスのリスト（Vercel環境に特化）
    const possiblePaths = [
      '/vercel/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/opt/google/chrome/chrome',
      '/opt/google/chrome-stable/chrome',
      '/snap/bin/chromium',
      '/snap/bin/google-chrome'
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

    // Puppeteer起動テスト（存在するパスがある場合のみ）
    let puppeteerTest = null;
    
    if (existingPaths.length > 0) {
      const testPath = existingPaths[0].path;
      console.log(`Puppeteer起動テスト開始: ${testPath}`);
      
      try {
        const browser = await puppeteer.launch({
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
        });

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

    // Puppeteer-core + channel テスト
    console.log('Puppeteer-core + channel テスト開始...');
    let puppeteerCoreTest = null;
    
    try {
      const browser = await puppeteer.launch({
        headless: true,
        channel: 'chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-extensions'
        ],
        timeout: 30000
      });
      
      const page = await browser.newPage();
      await page.goto('https://example.com');
      const title = await page.title();
      await browser.close();

      puppeteerCoreTest = {
        success: true,
        method: 'channel: chrome',
        title: title
      };
      console.log('Puppeteer-core + channel テスト成功:', puppeteerCoreTest);
    } catch (error) {
      puppeteerCoreTest = {
        success: false,
        method: 'channel: chrome',
        error: error.message
      };
      console.error('Puppeteer-core + channel テスト失敗:', error.message);
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        isVercel,
        VERCEL: process.env.VERCEL
      },
      pathCheck: pathResults,
      existingPaths: existingPaths.map(p => p.path),
      puppeteerTest,
      puppeteerCoreTest
    };

    console.log('=== Chrome Path Check Simple 実行完了 ===');
    console.log('結果:', JSON.stringify(result, null, 2));
    res.status(200).json(result);

  } catch (error) {
    console.error('Chrome Path Check Simple 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method
    });
  }
} 
