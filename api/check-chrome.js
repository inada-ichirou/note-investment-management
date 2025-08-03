// Puppeteer Chromeパス確認専用エンドポイント
import fs from 'fs';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import { execSync } from 'child_process';

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
      '/usr/bin/chrome-browser',
      // 追加のパス
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome-beta',
      '/usr/bin/google-chrome-unstable',
      '/opt/google/chrome-stable/chrome',
      '/opt/google/chrome-beta/chrome',
      '/opt/google/chrome-unstable/chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium-stable',
      '/usr/bin/chromium-beta',
      '/usr/bin/chromium-unstable',
      '/snap/bin/google-chrome',
      '/snap/bin/chromium',
      '/snap/bin/chromium-browser',
      '/usr/bin/chrome-browser',
      '/usr/bin/chrome-stable',
      '/usr/bin/chrome-beta',
      '/usr/bin/chrome-unstable',
      // Vercel固有のパス
      '/vercel/.cache/puppeteer/chrome/chrome',
      '/vercel/.cache/puppeteer/chrome-linux64/chrome',
      '/vercel/.cache/puppeteer/chrome/linux/chrome',
      '/vercel/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome',
      '/vercel/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
      '/vercel/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome-linux64/chrome'
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

    // システム全体でChromeを検索
    console.log('システム全体でChromeを検索中...');
    let systemSearchResults = [];
    
    try {
      // 一般的なディレクトリでChromeを検索
      const searchDirs = [
        '/usr/bin',
        '/usr/local/bin',
        '/opt',
        '/snap/bin',
        '/vercel/.cache/puppeteer',
        '/vercel/.cache/puppeteer/chrome',
        '/vercel/.cache/puppeteer/chrome/linux-127.0.6533.88'
      ];

      for (const dir of searchDirs) {
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir);
            const chromeFiles = files.filter(file => 
              file.includes('chrome') || file.includes('chromium')
            );
            if (chromeFiles.length > 0) {
              systemSearchResults.push({
                directory: dir,
                chromeFiles: chromeFiles
              });
              console.log(`ディレクトリ ${dir} でChromeファイル発見:`, chromeFiles);
            }
          } catch (error) {
            console.log(`ディレクトリ ${dir} の読み取りエラー:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log('システム検索エラー:', error.message);
    }

    // Puppeteer起動テスト
    let puppeteerTest = null;
    let puppeteerCoreTest = null;
    let puppeteerDownloadTest = null;
    
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

    // Puppeteer-core + channel テスト
    console.log('Puppeteer-core + channel テスト開始...');
    try {
      const browser = await puppeteerCore.launch({
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

    // Puppeteer browsers API テスト
    console.log('Puppeteer browsers API テスト開始...');
    try {
      // Puppeteerのbrowsers APIを使用してChromeをダウンロード
      const { execSync } = await import('child_process');
      console.log('Chromeをダウンロード中...');
      
      // npx puppeteer browsers install chrome を実行
      const downloadResult = execSync('npx puppeteer browsers install chrome', { 
        encoding: 'utf8',
        timeout: 60000 
      });
      console.log('Chromeダウンロード結果:', downloadResult);

      // ダウンロード後のパスを確認
      const downloadPath = '/vercel/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome';
      const downloadExists = fs.existsSync(downloadPath);
      console.log(`ダウンロード後のパス確認: ${downloadPath} - 存在: ${downloadExists}`);

      if (downloadExists) {
        // ダウンロードしたChromeでテスト
        const browser = await puppeteerCore.launch({
          headless: true,
          executablePath: downloadPath,
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

        puppeteerDownloadTest = {
          success: true,
          method: 'browsers API download',
          path: downloadPath,
          title: title
        };
        console.log('Puppeteer browsers API テスト成功:', puppeteerDownloadTest);
      } else {
        puppeteerDownloadTest = {
          success: false,
          method: 'browsers API download',
          error: 'Chromeダウンロード後のパスが見つかりません'
        };
        console.error('Chromeダウンロード後のパスが見つかりません');
      }
    } catch (error) {
      puppeteerDownloadTest = {
        success: false,
        method: 'browsers API download',
        error: error.message
      };
      console.error('Puppeteer browsers API テスト失敗:', error.message);
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
      systemSearchResults,
      puppeteerTest,
      puppeteerCoreTest,
      puppeteerDownloadTest
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
