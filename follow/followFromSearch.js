// 検索ページからフォローするスクリプト

import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { login } from '../noteAutoDraftAndSheetUpdate.js';

dotenv.config();

(async () => {
  console.log('Puppeteer起動オプションを取得します');
  const isCI = process.env.CI === 'true';
  const browser = await puppeteer.launch({
    headless: isCI ? 'new' : false,
    // 各操作（クリック・入力・ページ遷移など）ごとに、指定したミリ秒だけ「わざと遅延」を入れるための設定です。
    // たとえば slowMo: 100 とすると、すべてのPuppeteerの操作の間に100ミリ秒（0.1秒）ずつ待つようになります。
    
    // 一旦コメントアウト
    // slowMo: 100,
    protocolTimeout: 120000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    ],
    defaultViewport: null
  });
  const page = await browser.newPage();
  
  // ページのタイムアウト設定を延長（GitHub Actions環境用）
  page.setDefaultNavigationTimeout(120000); // 120秒
  page.setDefaultTimeout(120000); // 120秒
  // User-AgentをChromeのものに変更
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  // page.setDefaultTimeout(60000);

  console.log('noteにログインします');
  await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);
  console.log('ログイン完了');

  const targetUrl = 'https://note.com/search?context=user&q=%E3%83%95%E3%82%A9%E3%83%AD%E3%83%90100&size=10';
  console.log('クリエイター検索ページへ遷移します:', targetUrl);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // ページ遷移後にランダム待機（10〜30秒）
  // {
  //   const waitMs = 10000 + Math.floor(Math.random() * 20000);
  //   console.log(`ページ遷移後: ${waitMs / 1000}秒待機します`);
  //   await new Promise(resolve => setTimeout(resolve, waitMs));
  // }
  console.log('ページ遷移完了');

  const MAX_CLICKS = 13;
  let clickCount = 0;
  let totalFailures = 0;
  const maxFailures = 2;
  const maxScrolls = 20; // 安全のため最大スクロール回数を設定
  for (let i = 0; i < MAX_CLICKS; i++) {
    console.log(`${i + 1}回目の繰り返しが開始しました`);
    if (totalFailures >= maxFailures) {
      console.log(`クリックに累計${maxFailures}回失敗したため、処理を中断します。`);
      break;
    }
    // 検索ページに遷移
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // ページ遷移後のランダム待機は削除

    let targetBtn = null;
    for (let scroll = 0; scroll < maxScrolls; scroll++) {
      // スクロール
      console.log(`下までスクロールします (${scroll + 1}/${maxScrolls})`);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 1500));
      // ボタン検索
      const btns = await page.$$('button.a-button');
      for (const btn of btns) {
        const text = await btn.evaluate(el => el.innerText.trim());
        if (text === 'フォロー') {
          targetBtn = btn;
          break;
        }
      }
      if (targetBtn) break;
    }
    if (!targetBtn) {
      console.log('フォロー可能なボタンが見つかりません。');
      break;
    }
    console.log(`ボタン取得: ${i + 1}件目 btn!=null:`, targetBtn != null);
    // 本番環境ではクリック前にボタンが表示されているか明示的に待つ
    if (isCI) {
      try {
        console.log('クリック前: waitForSelector開始');
        await page.waitForSelector('button.a-button', { visible: true, timeout: 15000 });
        console.log('クリック前: waitForSelector成功');
      } catch (e) {
        console.log('クリック前のwaitForSelectorでタイムアウト:', e.message);
        totalFailures++;
        continue;
      }
    }
    try {
      // クリック前: 画面内に移動
      const isInView = await targetBtn.isIntersectingViewport();
      if (!isInView) {
        await targetBtn.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
        console.log('クリック前: scrollIntoView実行（画面外だったため）');
      } else {
        console.log('クリック前: すでに画面内にボタンがあります');
      }
      console.log('クリック前: 本当のユーザー操作をエミュレートしてクリック');
      await page.evaluate(el => {
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }, targetBtn);
      console.log('クリック後: clickイベント完了');
      clickCount++;

      // クリック後にボタンのテキスト変化を確認
      // await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機してから再取得
      // const afterText = await targetBtn.evaluate(el => el.innerText.trim());
      // console.log(`クリック後のボタンテキスト: ${afterText}`);

      // フォローに成功する場合はフォローしたクリエイター名を表示する
      console.log('クリエイター名取得開始');
      const creatorName = await targetBtn.evaluate(el => {
        const nameElem = el.closest('.m-userListItem')?.querySelector('.m-userListItem__nameLabel');
        return nameElem ? nameElem.textContent.trim() : 'クリエイター名不明';
      });
      console.log('クリエイター名取得完了');
      console.log(`フォローボタン${clickCount}件目をクリックしました｜クリエイター名: ${creatorName}`);
    } catch (e) {
      // 失敗時に1回だけリトライ
      try {
        console.log(`クリック失敗、リトライします:`, e.message);
        console.log('リトライ: clickイベント発火');
        await targetBtn.evaluate(el => el.click());
        console.log('リトライ: clickイベント完了');
        clickCount++;
        console.log('リトライ: クリエイター名取得開始');
        const creatorName = await targetBtn.evaluate(el => {
          const nameElem = el.closest('.m-userListItem')?.querySelector('.m-userListItem__nameLabel');
          return nameElem ? nameElem.textContent.trim() : 'クリエイター名不明';
        });
        console.log('リトライ: クリエイター名取得完了');
        console.log(`リトライ成功: フォローボタン${clickCount}件目をクリックしました｜クリエイター名: ${creatorName}`);
      } catch (e2) {
        totalFailures++;
        console.error(`フォローボタン${i + 1}のクリックに失敗しました（リトライも失敗）:`, e2.message, e2);
      }
    }
  }
  console.log(`フォロー処理が完了しました。合計${clickCount}件フォローしました。`);
  await browser.close();
  console.log('ブラウザを閉じました');
})();
