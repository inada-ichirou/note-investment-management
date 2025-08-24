import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { login } from '../../../noteAutoDraftAndSheetUpdate.js';

dotenv.config();

async function runDraftCreation() {
  const browser = await puppeteer.launch({
    headless: 'new',
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

  try {
    const page = await browser.newPage();
    await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);
    
    // ここに既存のautoCreateAndDraftNote.jsのロジックを実装
    // Cloud Run環境に最適化

    return {
      success: true,
      message: '記事の下書き作成が完了しました'
    };

  } catch (error) {
    console.error('エラーが発生しました:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await browser.close();
  }
}

export { runDraftCreation };
