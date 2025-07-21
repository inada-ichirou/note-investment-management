// Vercel Functions用のAPIエンドポイント
export default async function handler(req, res) {
  // POSTリクエストのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // 認証チェック（cron-job.orgからのリクエスト）
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    console.log('=== Auto Note 実行開始 ===');
    
    // 環境変数チェック
    if (!process.env.OPENROUTER_API_KEY || !process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
      throw new Error('必要な環境変数が設定されていません');
    }
    
    // スクリプト実行（autoCreateAndDraftNote.jsの内容をここに統合）
    const result = await executeAutoNote();
    
    console.log('=== Auto Note 実行完了 ===');
    res.status(200).json({ 
      success: true, 
      message: 'Auto Note 実行完了',
      timestamp: new Date().toISOString(),
      result 
    });
    
  } catch (error) {
    console.error('Auto Note 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function executeAutoNote() {
  // autoCreateAndDraftNote.jsの主要ロジックをここに移動
  // Puppeteerの起動とnote.com操作
  const puppeteer = require('puppeteer');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // note.comにログイン
    await page.goto('https://note.com/login');
    await page.type('input[name="email"]', process.env.NOTE_EMAIL);
    await page.type('input[name="password"]', process.env.NOTE_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // 記事作成処理
    // ... 既存のロジック
    
    return { status: 'success', message: '記事作成完了' };
    
  } finally {
    await browser.close();
  }
} 
