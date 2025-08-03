// @sparticuz/chromiumを使用したChrome確認エンドポイント
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  console.log('=== Chrome V2 Check API 実行開始 ===');
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

    // @sparticuz/chromiumの情報を取得
    console.log('@sparticuz/chromium情報:');
    console.log('- executablePath:', await chromium.executablePath());
    console.log('- headless:', chromium.headless);
    console.log('- args:', chromium.args);
    console.log('- defaultViewport:', chromium.defaultViewport);

    // Puppeteer起動テスト
    console.log('Puppeteer + @sparticuz/chromium テスト開始...');
    let puppeteerTest = null;
    
    try {
      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        timeout: 30000
      });
      
      const page = await browser.newPage();
      await page.goto('https://example.com', { waitUntil: 'networkidle2' });
      const title = await page.title();
      await browser.close();

      puppeteerTest = {
        success: true,
        method: '@sparticuz/chromium',
        title: title,
        executablePath: await chromium.executablePath()
      };
      console.log('Puppeteer + @sparticuz/chromium テスト成功:', puppeteerTest);
    } catch (error) {
      puppeteerTest = {
        success: false,
        method: '@sparticuz/chromium',
        error: error.message,
        executablePath: await chromium.executablePath()
      };
      console.error('Puppeteer + @sparticuz/chromium テスト失敗:', error.message);
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
      chromiumInfo: {
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        args: chromium.args,
        defaultViewport: chromium.defaultViewport
      },
      puppeteerTest
    };

    console.log('=== Chrome V2 Check API 実行完了 ===');
    console.log('結果:', JSON.stringify(result, null, 2));
    res.status(200).json(result);

  } catch (error) {
    console.error('Chrome V2 Check API 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method
    });
  }
} 
