// はじめてのnoteページの記事一覧から、クリックして遷移
// フォローする、という流れ
// アクティブで、フォロバしてくれそうなユーザーをフォローする上ではこの形が良さそう

// github actions 使用時間累積確認ページ
// https://github.com/settings/billing/usage?period=3&group=1&customer=5978784

require('dotenv').config();
const puppeteer = require('puppeteer');
const { login } = require('../noteAutoDraftAndSheetUpdate');

function logTime(label) {
  const now = new Date();
  console.log(`[${now.toISOString()}] ${label}`);
}

(async () => {
  logTime('Puppeteer起動オプションを取得します');
  // Fly.io環境でのPuppeteer起動オプション（Alex MacArthurの記事を参考）
  const isFly = !!process.env.FLY_APP_NAME;
  const isCI = process.env.CI === 'true';
  console.log('process.env.CIの値:', process.env.CI);
  console.log('isCI:', isCI);
  console.log('isFly:', isFly);
  
  // Fly.io環境でのPuppeteer起動オプション（Alex MacArthurの記事を参考）
  // 注意: Puppeteerは必須機能のため無効化しない
  console.log('=== Fly.io環境でのPuppeteer起動 ===');
  
  logTime('puppeteer.launch 開始');
  const browser = await puppeteer.launch({
    headless: isFly || isCI ? true : false,
    executablePath: '/usr/bin/google-chrome-stable',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--no-first-run',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--window-size=1280,800',
      '--remote-debugging-port=9222',
      '--disable-dev-tools',
      '--disable-infobars',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-domain-reliability',
      '--disable-hang-monitor',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--metrics-recording-only',
      '--safebrowsing-disable-auto-update',
      '--password-store=basic',
      '--use-mock-keychain',
      '--lang=ja-JP',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  logTime('puppeteer.launch 完了');
  
  logTime('新規ページ作成開始');
  const page = await browser.newPage();
  logTime('puppeteer.launch 開始');
  const browser = await puppeteer.launch({
    headless: isFly || isCI ? true : false,
    executablePath: '/usr/bin/google-chrome-stable',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection'
    ]
  });
  logTime('puppeteer.launch 完了');
  
  logTime('新規ページ作成開始');
  const page = await browser.newPage();

  let isLimit = false; // 上限検知フラグ

  // ダイアログ（alert等）検知時に即座に処理を停止
  page.on('dialog', async dialog => {
    const msg = dialog.message();
    console.log('[ALERT検知]', msg);
    if (msg.includes('上限に達したためご利用できません')) {
      await dialog.dismiss(); // OKボタンを押す
      console.log('【noteフォロー上限に達したため、処理を中断します】');
      isLimit = true; // 上限フラグを立てる
      await browser.close(); // ブラウザを閉じる
      // ここでは process.exit(1) を呼ばない
    } else {
      await dialog.dismiss();
    }
  });

  logTime('新規ページ作成完了');

  /*
  logTime('noteにログイン開始');
  await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);
  logTime('noteログイン完了');
  */

  // ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー
  // はじめてのnoteのページ
  // const targetUrl = 'https://note.com/interests/%E3%81%AF%E3%81%98%E3%82%81%E3%81%A6%E3%81%AEnote';

  // 注目のページ
  // const targetUrl = 'https://note.com/notemagazine/m/mf2e92ffd6658'

  // 検索ワードリスト
  const searchWords = [
    '資産運用',
    '資産形成',
    '株',
    '投資信託',
    'FIRE',
    '投資',
    '日記',
    'フォロバ',
    'はじめて',
    '初めて',
    // 追加キーワード
    '貯金',
    '節約',
    '副業',
    'NISA',
    'iDeCo',
    '積立',
    '長期投資',
    '分散投資',
    '債券',
    '不動産投資',
    '個別株',
    '投資初心者',
    '資産管理',
    '家計管理',
    '老後資金',
    '保険',
    '年金',
    '投資家',
  ];

  // 1日あたりの実行回数（例: 3時間ごと=8回）
  const runsPerDay = 8;
  const now = new Date();
  // 年初からの日数（1月1日が1）
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  // 今日の何回目の実行か（3時間ごとなら0～7）
  const runIndex = Math.floor(now.getHours() / 3);
  // インデックス計算
  const index = (dayOfYear * runsPerDay + runIndex) % searchWords.length;
  // インデックス計算の解説ログ
  console.log('【順番インデックス計算】');
  console.log('searchWords.length =', searchWords.length);
  console.log('runsPerDay =', runsPerDay);
  console.log('dayOfYear =', dayOfYear);
  console.log('runIndex =', runIndex);
  console.log('index = (dayOfYear * runsPerDay + runIndex) % searchWords.length =', index);

  const word = searchWords[index];
  const encoded = encodeURIComponent(word);
  const targetUrl = `https://note.com/search?q=${encoded}&context=note&mode=search`;

  // ログ出力（デバッグ用）
  console.log('【検索ワード選択ログ】');
  console.log('現在日時:', now.toString());
  console.log('インデックス:', index);
  console.log('選択ワード:', word);
  console.log('検索URL:', targetUrl);

  // ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー

  /*
  logTime('対象ページへ遷移開始');
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });
  logTime('対象ページ遷移完了');

  // 記事一覧ページで10回スクロール
  logTime('記事一覧ページでスクロール開始');
  for (let i = 0; i < 10; i++) {
    console.log(`下までスクロールします (${i + 1}/10)`);
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  logTime('記事一覧ページでスクロール完了');
  */

  // クリエイターリンクの取得セレクターを指定
  let creatorLinkTargetSelector

  // 検索ページの場合、div
  if (targetUrl.includes('search')) {
    creatorLinkTargetSelector = 'div.o-largeNoteSummary__userName';
  } else {
    creatorLinkTargetSelector = 'span.o-noteItem__userText';
  }

  // クリエイターリンクとクリエイター名を取得
  logTime('クリエイターリンク・名の取得開始');
  const creatorLinkAndNames = await page.$$eval(creatorLinkTargetSelector, elements =>
    elements.map(element => {
      // クリエイター名を取得
      const creatorName = element.textContent.trim();
      // クリエイター名の親要素（または近く）にaタグがある場合
      let a = element.closest('a') || element.parentElement.querySelector('a');
      return a ? { url: a.href, name: creatorName, elementSelector: a.outerHTML } : null;
    }).filter(Boolean)
  );
  logTime('クリエイターリンク・名の取得完了');

  // クリエイター名で重複を除外
  logTime('クリエイター重複除外開始');
  const uniqueCreators = [];
  const seenNames = new Set();
  for (const item of creatorLinkAndNames) {
    if (!seenNames.has(item.name)) {
      uniqueCreators.push(item);
      seenNames.add(item.name);
    }
  }
  logTime('クリエイター重複除外完了');

  console.log('ユニークなクリエイターを', uniqueCreators.length, '件取得しました');

  let followCount = 0;
  // 検索結果ページ上でポップアップのフォローボタンをクリックする方式に変更
  for (let i = 0; i < uniqueCreators.length && followCount < 15; i++) {
    if (isLimit) break; // 上限検知時は即座にループを抜ける
    const name = uniqueCreators[i].name;
    logTime(`クリエイター${i + 1}のホバー＆ポップアップフォロー処理開始:（${name}）`);
    try {
      // 検索結果ページの各クリエイター要素を再取得
      const userWrappers = await page.$$('.o-largeNoteSummary__userWrapper');
      if (!userWrappers[i]) continue;
      // aタグを取得してhover
      const aTag = await userWrappers[i].$('a.o-largeNoteSummary__user');
      if (!aTag) continue;
      await aTag.hover();
      // ホバー後に明示的な待機時間を追加（ポップアップが見やすくなるように）
      await new Promise(resolve => setTimeout(resolve, 800)); // 0.8秒待機
      // await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
      // ポップアップが出るまで待機（最大2.5秒に延長）
      await page.waitForSelector('.o-quickLook', { visible: true, timeout: 2500 });
      // ポップアップ内のフォローボタンを取得
      const followBtn = await page.$('.o-quickLook .a-button');
      if (!followBtn) {
        logTime('フォローボタンが見つかりませんでした');
        continue;
      }
      // ボタンのテキストが「フォロー」か確認
      const btnText = await followBtn.evaluate(el => el.innerText.trim());
      if (btnText === 'フォロー') {
        await followBtn.click();
        // 状態変化を待つ（「フォロー中」になるまで or 最大1.5秒）
        await Promise.race([
          page.waitForFunction(
            () => {
              const btn = document.querySelector('.o-quickLook .a-button');
              return btn && btn.innerText.trim() === 'フォロー中';
            },
            { timeout: 1500 }
          ),
          new Promise(resolve => setTimeout(resolve, 1500))
        ]);
        logTime(`ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー`);
        logTime(`フォロー成功！！（${followCount + 1}件目）｜クリエイター名（${name}）`);
        logTime(`ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー`);
        followCount++;
      } else {
        logTime('すでにフォロー済み、またはボタン状態が「フォロー」ではありません');
      }
      // 少し待ってから次へ（0.3秒）
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (e) {
      logTime(`エラー発生: ${e.message}`);
      continue;
    }
  }
  logTime('全フォロー処理完了');
  // 上限検知時はここで安全に終了
  if (isLimit) {
    process.exit(1);
  }
  await browser.close();
  console.log('ブラウザを閉じました');
})(); 
