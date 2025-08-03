// @sparticuz/chromiumを使用した記事作成エンドポイント
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fetch from 'node-fetch';
import { login, goToNewPost, dragAndDropToAddButton, fillArticle, saveDraft, closeDialogs } from '../noteAutoDraftAndSheetUpdate.js';
import { generateArticle, rewriteSection, generateTagsFromContent, rewriteAndTagArticle, topics, patterns, MODEL, API_URL, extractTitleAndFilterH1 } from '../autoCreateAndDraftNote.js';

export default async function handler(req, res) {
  // GETとPOSTリクエストを許可
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const TIMEOUT_LIMIT = 240000; // 4分（余裕を持って）

  console.log('=== Create Draft V2 API 実行開始 ===');
  console.log('Method:', req.method);
  console.log('実行時刻:', new Date().toISOString());

  // タイムアウトチェック関数
  const checkTimeout = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > TIMEOUT_LIMIT) {
      throw new Error(`処理時間が制限を超えました: ${elapsed}ms`);
    }
  };

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
    checkTimeout();
    const article = await generateArticle(randomTopic, randomPattern);
    console.log('記事生成完了');

    console.log('AI生成記事全文:\n', article);
    if (!article || article.length < 30) {
      console.error('AI記事生成に失敗、または内容が不十分です。処理を中断します。');
      return;
    }
  
    // 本文からタイトル抽出とh1タイトル行除去
    const { title, filteredArticle } = extractTitleAndFilterH1(article);

    // 5. 記事リライト・チェック（importしたrewriteAndTagArticleを利用）
    console.log('記事リライト・チェック開始...');
    checkTimeout();
    let rewrittenArticle = await rewriteAndTagArticle(filteredArticle, API_URL, API_KEY, MODEL);
    console.log('記事リライト・チェックが完了しました');

    // @sparticuz/chromiumを使用したPuppeteer起動
    console.log('Puppeteer起動開始...');
    checkTimeout();
    
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      timeout: 60000
    });
    console.log('Puppeteer起動完了');

    const page = await browser.newPage();
    console.log('ブラウザページ作成完了');
    
    // User-Agent設定
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    // note.comにログイン
    console.log('note.comにログイン中...');
    checkTimeout();
    await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);
    console.log('note.comログイン完了');

    // 新規投稿画面へ遷移
    console.log('新規投稿画面へ遷移中...');
    checkTimeout();
    await goToNewPost(page);
    console.log('新規投稿画面遷移完了');
    
    // サムネイル画像アップロード
    console.log('サムネイル画像アップロード中...');
    checkTimeout();
    await dragAndDropToAddButton(page);
    console.log('サムネイル画像アップロード完了');
    
    // 記事タイトル・本文を入力
    console.log('記事タイトル・本文入力中...');
    checkTimeout();
    await fillArticle(page, title, rewrittenArticle);
    console.log('記事タイトル・本文入力完了');
    
    // 下書き保存
    console.log('下書き保存中...');
    checkTimeout();
    await saveDraft(page);
    console.log('下書き保存完了');
    
    // ダイアログを閉じる
    console.log('ダイアログを閉じる中...');
    checkTimeout();
    await closeDialogs(page);
    console.log('ダイアログを閉じる完了');

    await browser.close();

    const result = {
      success: true,
      message: 'Create draft V2 execution completed',
      timestamp: new Date().toISOString(),
      method: req.method,
      title: title,
      topic: randomTopic,
      pattern: randomPattern,
      contentLength: rewrittenArticle.length,
      environment: 'Vercel Functions + @sparticuz/chromium',
      executionTime: Date.now() - startTime
    };

    console.log('=== Create Draft V2 API 実行完了 ===');
    console.log('結果:', JSON.stringify(result, null, 2));
    res.status(200).json(result);

  } catch (error) {
    console.error('Create Draft V2 API 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method,
      executionTime: Date.now() - startTime
    });
  }
} 
