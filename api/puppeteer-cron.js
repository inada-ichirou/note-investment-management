// Puppeteerを使用したVercel関数
import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  // GETとPOSTリクエストを許可
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let browser = null;
  
  try {
    console.log('=== Puppeteer Cron 実行開始 ===');
    console.log('Method:', req.method);
    
    // 環境変数チェック
    if (!process.env.OPENROUTER_API_KEY || !process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
      throw new Error('必要な環境変数が設定されていません');
    }

    // Puppeteer起動オプション（Vercel用）
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ],
      executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome-stable'
    };

    console.log('Puppeteer起動中...');
    browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    
    // User-Agent設定
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // ビューポート設定
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('note.comにアクセス中...');
    await page.goto('https://note.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // ログインボタンをクリック
    await page.waitForSelector('a[href="/login"]', { timeout: 10000 });
    await page.click('a[href="/login"]');
    
    // ログインフォーム入力
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.type('input[name="email"]', process.env.NOTE_EMAIL);
    await page.type('input[name="password"]', process.env.NOTE_PASSWORD);
    
    // ログインボタンクリック
    await page.click('button[type="submit"]');
    
    // ログイン完了待機
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('ログイン成功！');
    
    // ダッシュボードに移動
    await page.goto('https://note.com/dashboard', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 新規記事作成ボタンをクリック
    await page.waitForSelector('a[href="/new"]', { timeout: 10000 });
    await page.click('a[href="/new"]');
    
    // 記事作成ページ待機
    await page.waitForSelector('.editor', { timeout: 30000 });
    
    console.log('記事作成ページにアクセス成功！');
    
    // テスト用のタイトルと本文を入力
    const testTitle = `自動投稿テスト - ${new Date().toISOString()}`;
    const testContent = `これはVercel上でPuppeteerを使用した自動投稿テストです。\n\n実行時刻: ${new Date().toISOString()}`;
    
    // タイトル入力
    await page.waitForSelector('input[placeholder*="タイトル"]', { timeout: 10000 });
    await page.type('input[placeholder*="タイトル"]', testTitle);
    
    // 本文入力
    await page.waitForSelector('.editor', { timeout: 10000 });
    await page.click('.editor');
    await page.keyboard.type(testContent);
    
    console.log('記事内容入力完了！');
    
    // 下書き保存ボタンをクリック
    await page.waitForSelector('button:contains("下書き保存")', { timeout: 10000 });
    await page.click('button:contains("下書き保存")');
    
    // 保存完了待機
    await page.waitForTimeout(3000);
    
    console.log('下書き保存完了！');
    
    const result = {
      success: true,
      message: 'Puppeteer自動化実行完了',
      timestamp: new Date().toISOString(),
      method: req.method,
      title: testTitle,
      environment: 'Vercel Functions with Puppeteer'
    };
    
    console.log('=== Puppeteer Cron 実行完了 ===');
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Puppeteer Cron 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method
    });
  } finally {
    // ブラウザを確実に閉じる
    if (browser) {
      try {
        await browser.close();
        console.log('ブラウザを閉じました');
      } catch (closeError) {
        console.error('ブラウザクローズエラー:', closeError);
      }
    }
  }
} 
