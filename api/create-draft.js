// 記事を自動作成して下書きに追加するAPIエンドポイント
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import fetch from 'node-fetch';
import { login, goToNewPost, dragAndDropToAddButton, fillArticle, saveDraft, closeDialogs } from '../noteAutoDraftAndSheetUpdate.js';
import { generateArticle, rewriteSection, generateTagsFromContent, rewriteAndTagArticle, topics, patterns, MODEL, API_URL, extractTitleAndFilterH1 } from '../autoCreateAndDraftNote.js';

export default async function handler(req, res) {
  // GETとPOSTリクエストを許可
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== Create Draft API 実行開始 ===');
  console.log('Method:', req.method);
  console.log('実行時刻:', new Date().toISOString());

  try {
    // 環境変数チェック
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }
    if (!process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
      throw new Error('NOTE_EMAIL or NOTE_PASSWORD is not set');
    }

    const API_KEY = process.env.OPENROUTER_API_KEY;

    // ランダムに題材と切り口を選択
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];

    console.log(`選択された題材: ${randomTopic}`);
    console.log(`選択された切り口: ${randomPattern}`);

    // 記事生成
    console.log('記事を生成中...');
    const article = await generateArticle(randomTopic, randomPattern);
    console.log('記事生成完了');

    console.log('AI生成記事全文:\n', article);
    if (!article || article.length < 30) {
      console.error('AI記事生成に失敗、または内容が不十分です。処理を中断します。');
      return;
    }
  
    
    // 記事をセクションに分割

    // console.log('タグを生成中...');
    // const tags = await generateTagsFromContent(improvedContent, API_URL, API_KEY, MODEL);
    // console.log('タグ生成完了');

    // 本文からタイトル抽出とh1タイトル行除去
    const { title, filteredArticle } = extractTitleAndFilterH1(article);

    // 5. 記事リライト・チェック（importしたrewriteAndTagArticleを利用）
    let rewrittenArticle = await rewriteAndTagArticle(filteredArticle, API_URL, API_KEY, MODEL);
    console.log('記事リライト・チェックが完了しました');

    // Chromeパスの検出
    const chromePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/opt/homebrew/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];

    let executablePath = null;
    for (const path of chromePaths) {
      if (fs.existsSync(path)) {
        executablePath = path;
        break;
      }
    }

    // Puppeteer起動
    const browser = await puppeteer.launch({
      executablePath: executablePath || process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--window-size=1280,900'
      ],
      timeout: 60000
    });

    const page = await browser.newPage();
    
    // User-Agent設定
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    // note.comにログイン
    console.log('note.comにログイン中...');
    await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);

    // 新規投稿画面へ遷移
    await goToNewPost(page);
    
    // サムネイル画像アップロード
    await dragAndDropToAddButton(page);
    
    // 記事タイトル・本文を入力
    await fillArticle(page, title, rewrittenArticle);
    
    // 下書き保存
    await saveDraft(page);
    
    // ダイアログを閉じる
    await closeDialogs(page);

    await browser.close();

    const result = {
      success: true,
      message: 'Create draft execution completed',
      timestamp: new Date().toISOString(),
      method: req.method,
      title: title,
      topic: randomTopic,
      pattern: randomPattern,
      contentLength: rewrittenArticle.length,
      // tags: tags,
      environment: 'Vercel Functions'
    };

    console.log('=== Create Draft API 実行完了 ===');
    console.log('結果:', JSON.stringify(result, null, 2));
    res.status(200).json(result);

  } catch (error) {
    console.error('Create Draft API 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method
    });
  }
}
