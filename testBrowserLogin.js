const puppeteer = require('puppeteer');
const { login } = require('./noteAutoDraftAndSheetUpdate');

// メイン処理
(async () => {
  console.log('=== ブラウザ起動・ログインテスト開始 ===');
  
  try {
    // 環境変数チェック
    const email = process.env.NOTE_EMAIL;
    const password = process.env.NOTE_PASSWORD;
    
    if (!email || !password) {
      console.error('❌ NOTE_EMAIL または NOTE_PASSWORD が設定されていません');
      process.exit(1);
    }
    
    console.log('✅ 環境変数設定確認済み');
    console.log('NOTE_EMAIL:', email ? `${email.substring(0, 3)}***` : '未設定');
    
    // Puppeteer起動設定
    console.log('ブラウザ起動中...');
    const isCI = process.env.CI === 'true';
    const browser = await puppeteer.launch({
      headless: isCI ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--no-first-run',
        '--disable-default-apps'
      ],
      defaultViewport: { width: 1280, height: 720 }
    });
    
    console.log('✅ ブラウザ起動成功！');
    
    const page = await browser.newPage();
    console.log('✅ 新しいページ作成成功！');
    
    // User-Agentを設定
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // 既存のlogin関数を使用してログインテスト実行
    console.log('Puppeteerブラウザテストを開始します...');
    const loginSuccess = await login(page, email, password);
    
    if (loginSuccess) {
      console.log('🎉 ブラウザテスト完了: ログイン機能は正常に動作しています');
    } else {
      console.log('⚠️ ブラウザテスト警告: ログイン機能に問題がある可能性があります');
      process.exit(1);
    }
    
    await browser.close();
    console.log('✅ ブラウザクローズ完了');
    
  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error);
    process.exit(1);
  }
  
  console.log('=== テスト完了 ===');
})(); 
