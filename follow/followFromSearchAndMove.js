// 検索結果から、クリエイター一覧を表示して、
// 一覧画面でフォロー

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

  // スクロールして十分な件数のクリエイターを表示
  const maxScrolls = 10;
  for (let scroll = 0; scroll < maxScrolls; scroll++) {
    console.log(`下までスクロールします (${scroll + 1}/${maxScrolls})`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // クリエイターリンクを取得
  const creatorLinks = await page.$$eval('a.m-userListItem__link', links => links.map(a => a.href));
  console.log(`クリエイターリンクを${creatorLinks.length}件取得しました`);

  const MAX_CLICKS = 13;
  let clickCount = 0;
  let totalFailures = 0;
  const maxFailures = 2;

  for (let i = 0; i < creatorLinks.length && clickCount < MAX_CLICKS; i++) {
    if (totalFailures >= maxFailures) {
      console.log(`クリックに累計${maxFailures}回失敗したため、処理を中断します。`);
      break;
    }
    const link = creatorLinks[i];
    console.log(`${i + 1}件目のクリエイター詳細ページを新しいタブで開きます: ${link}`);
    const detailPage = await browser.newPage();
    await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    try {
      await detailPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // ボタンが出現するまで待機
      await detailPage.waitForSelector('button', { visible: true, timeout: 10000 });
      // ボタン取得
      let btns = await detailPage.$$('button');
      let btn = null;
      for (const b of btns) {
        const text = await b.evaluate(el => el.innerText.trim());
        if (text === 'フォロー') {
          btn = b;
          break;
        }
      }
      if (!btn) {
        console.log('フォローボタンが見つかりません（すでにフォロー済み、またはボタンが存在しません）');
        await detailPage.close();
        continue;
      }
      // 取得直後に100ms待機し、再取得
      // await new Promise(resolve => setTimeout(resolve, 100));
      // btns = await detailPage.$$('button');
      // let btn2 = null;
      // for (const b of btns) {
      //   const text = await b.evaluate(el => el.innerText.trim());
      //   if (text === 'フォロー') {
      //     btn2 = b;
      //     break;
      //   }
      // }
      // if (btn2) btn = btn2;
      // 画面内に移動
      const isInView = await btn.isIntersectingViewport();
      if (!isInView) {
        await btn.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
      }
      // 本当のユーザー操作をエミュレートしてクリック
      await detailPage.evaluate(el => {
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }, btn);
      clickCount++;
      // クリエイター名取得（h1.break-all.font-bold.text-text-primary.md\:text-lg）
      const creatorName = await detailPage.evaluate(() => {
        const h1 = document.querySelector('h1.break-all.font-bold.text-text-primary.md\\:text-lg');
        return h1 ? h1.textContent.trim() : 'クリエイター名不明';
      });
      console.log(`フォローボタン${clickCount}件目をクリックしました｜クリエイター名: ${creatorName}`);
    } catch (e) {
      totalFailures++;
      console.error(`フォローボタン${i + 1}のクリックに失敗しました:`, e.message, e);
    }
    await detailPage.close();
  }
  console.log(`フォロー処理が完了しました。合計${clickCount}件フォローしました。`);
  await browser.close();
  console.log('ブラウザを閉じました');
})();
