import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { login } from '../../noteAutoDraftAndSheetUpdate.js';

dotenv.config();

async function runFollowAutomation() {
  const browser = await puppeteer.launch({
    headless: 'new',  // Cloud Run用に強制的にheadlessモード
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--window-size=1280,900'
    ],
    defaultViewport: null
  });

  let isLimit = false;
  let followCount = 0;

  try {
    const page = await browser.newPage();
    
    // ログイン処理
    await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);

    // アラート検知の設定
    page.on('dialog', async dialog => {
      const msg = dialog.message();
      console.log('[ALERT検知]', msg);
      if (msg.includes('上限に達したためご利用できません')) {
        await dialog.dismiss();
        console.log('【noteフォロー上限に達したため、処理を中断します】');
        isLimit = true;
      } else {
        await dialog.dismiss();
      }
    });

    const searchWords = ['個人投資家', '株式投資', '投資家'];
    const targetUrl = `https://note.com/search?q=${encodeURIComponent(searchWords[Math.floor(Math.random() * searchWords.length)])}&mode=note`;

    // 検索ページへ遷移
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    // スクロール処理
    for (let i = 0; i < 10 && !isLimit; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // フォローボタンの処理
    const followButtons = await page.$$('button[data-label="follow-button"]');
    console.log(`${followButtons.length}件のフォローボタンを検出しました`);

    for (const button of followButtons) {
      if (isLimit) break;

      try {
        await button.click();
        followCount++;
        console.log(`${followCount}人目をフォローしました`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log('フォローボタンのクリックに失敗:', error);
      }
    }

    return {
      success: true,
      followCount,
      isLimit,
      message: isLimit ? 'フォロー上限に達しました' : 'フォロー処理が完了しました'
    };

  } catch (error) {
    console.error('エラーが発生しました:', error);
    return {
      success: false,
      followCount,
      isLimit,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

// Cloud Run用のエンドポイントハンドラ
export async function handleFollowRequest(req, res) {
  try {
    const result = await runFollowAutomation();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// 直接実行用
if (process.env.EXECUTE_DIRECTLY === 'true') {
  runFollowAutomation();
}
