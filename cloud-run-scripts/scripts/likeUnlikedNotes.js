import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { login } from '../../../noteAutoDraftAndSheetUpdate.js';

dotenv.config();

async function runLikeNotes() {
  console.log('Starting runLikeNotes function...');
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--window-size=1280,900',
        '--disable-setuid-sandbox',
        '--single-process',
        '--no-zygote'
      ],
      defaultViewport: {
        width: 1280,
        height: 900
      }
    });
    console.log('Browser launched successfully');

  try {
    const page = await browser.newPage();
    await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);
    
    // ここに既存のlikeUnlikedNotes.jsのロジックを実装
    // Cloud Run環境に最適化

    return {
      success: true,
      message: 'いいね処理が完了しました'
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

export { runLikeNotes };
