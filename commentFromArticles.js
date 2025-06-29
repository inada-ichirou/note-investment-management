// 他の人の記事に自動でコメントするスクリプト
// Puppeteerを利用
// 日本語コメントで説明

require('dotenv').config();
const puppeteer = require('puppeteer');
const { login } = require('./noteAutoDraftAndSheetUpdate');
const fs = require('fs');

// コメント済み記事を記録するファイル
const COMMENTED_FILE = 'commented_articles.json';

// コメント定型文リスト
const comments = [
  // 'とても参考になりました！ありがとうございます！',
  // '素晴らしい記事ですね。勉強になりました！',
  '記事を拝読いたしました！また読ませて頂きます🙇‍♂️',
  // '分かりやすい解説で助かりました。',
  // '共感できる内容でした！',
  // 'これからも応援しています！',
  // '有益な情報をありがとうございます！',
  // 'とても分かりやすかったです！',
  // '素敵な記事をありがとうございます！',
];

function getRandomComment() {
  return comments[Math.floor(Math.random() * comments.length)];
}

function logTime(label) {
  const now = new Date();
  console.log(`[${now.toISOString()}] ${label}`);
}

// コメント済み記事リストを読み込む関数
function loadCommentedArticles() {
  if (!fs.existsSync(COMMENTED_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(COMMENTED_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

// コメント済み記事リストを保存する関数
function saveCommentedArticles(list) {
  fs.writeFileSync(COMMENTED_FILE, JSON.stringify(list, null, 2), 'utf8');
}

(async () => {
  logTime('Puppeteer起動オプションを取得します');
  const isCI = process.env.CI === 'true';
  logTime('puppeteer.launch 開始');
  const browser = await puppeteer.launch({
    headless: isCI ? 'old' : false,
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
  logTime('puppeteer.launch 完了');
  const page = await browser.newPage();

  // ダイアログ（alert等）検知時に即座に処理を停止
  page.on('dialog', async dialog => {
    const msg = dialog.message();
    console.log('[ALERT検知]', msg);
    await dialog.dismiss();
  });

  logTime('noteにログイン開始');
  await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);
  logTime('noteログイン完了');

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
  ];

  // 実行タイミングでワードを選択
  const runsPerDay = 8;
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const runIndex = Math.floor(now.getHours() / 3);
  const index = (dayOfYear * runsPerDay + runIndex) % searchWords.length;
  const word = searchWords[index];
  const encoded = encodeURIComponent(word);
  const targetUrl = `https://note.com/search?q=${encoded}&context=note&mode=search`;

  // 選択された検索ワードをログに表示
  logTime(`選択された検索ワード: ${word}`);

  logTime('対象ページへ遷移開始');
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });
  logTime('対象ページ遷移完了');

  // 記事一覧ページで10回スクロール
  logTime('記事一覧ページでスクロール開始');
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  logTime('記事一覧ページでスクロール完了');

  // 記事リンクの取得
  logTime('記事リンクの取得開始');
  // 新しいセレクタで記事リンクを取得し、絶対URLに変換
  const articleLinks = await page.$$eval('a.m-largeNoteWrapper__link', (elements) => {
    return elements.map(a => a.href.startsWith('http') ? a.href : 'https://note.com' + a.getAttribute('href'));
  });
  logTime('記事リンクの取得完了');
  // 取得した記事URLをすべてログ出力
  console.log('【記事URL一覧】');
  articleLinks.forEach((url, idx) => {
    console.log(`  [${idx + 1}] ${url}`);
  });

  // コメント投稿完了数で制御
  const MAX_COMMENTED_ARTICLES = 1; // 何個コメントできたら終了するか

  let commentedCount = 0;
  // コメント済み記事リストを読み込む
  let commentedArticles = loadCommentedArticles();
  for (let i = 0; i < articleLinks.length; i++) {
    if (commentedCount >= MAX_COMMENTED_ARTICLES) break;
    const articleUrl = articleLinks[i];
    logTime(`記事詳細ページへ遷移: ${articleUrl}`);
    await page.goto(articleUrl, { waitUntil: 'networkidle2' });
    logTime(`記事詳細ページに到達: ${articleUrl}`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // ページ安定化待ち

    // // コメント欄が表示されるように2回スクロール
    // for (let s = 0; s < 2; s++) {
    //   await page.evaluate(() => {
    //     window.scrollBy(0, window.innerHeight);
    //   });
    //   logTime(`記事詳細ページでスクロール: ${s + 1}回目`);
    //   await new Promise(resolve => setTimeout(resolve, 1000));
    // }

    // コメント欄のセレクタ（1つだけを狙う）
    const commentSelector = 'textarea.o-commentAreaCreateComment__inputMessage';
    let foundSelector = null;
    try {
      await page.waitForSelector(commentSelector, { timeout: 5000 });
      foundSelector = commentSelector;
      logTime(`コメント入力欄が見つかりました: ${commentSelector}`);
    } catch (e) {
      logTime('コメント入力欄が見つかりませんでした');
      continue;
    }

    // コメント入力
    const comment = getRandomComment();
    logTime(`コメント入力: ${comment}`);
    await page.type(foundSelector, comment);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 送信ボタンをクリック（新しいセレクタで）
    const sendButtons = await page.$$('button.a-button');
    let sent = false;
    for (const btn of sendButtons) {
      const text = await btn.evaluate(el => el.innerText.trim());
      if (text && text.includes('送信')) {
        await btn.click();
        sent = true;
        logTime('コメント送信ボタンをクリックしました');
        break;
      }
    }
    if (!sent) {
      logTime('コメント送信ボタンが見つかりませんでした');
      continue;
    } else {
      logTime('コメント送信ボタンをクリックしました');
      // ポップアップが表示される場合の追加処理
      try {
        // ポップアップのチェックボックスが出るまで最大5秒待機
        await page.waitForSelector('#commentAcknowledgement', { timeout: 5000 });
        logTime('ポップアップの同意チェックボックスが見つかりました');
        // チェックを入れる
        await page.click('#commentAcknowledgement');
        logTime('同意チェックボックスにチェックを入れました');
        // ポップアップ内の送信ボタンを探してクリック
        const modalSendButtons = await page.$$('.m-modalFooterButtonGroup__button');
        let modalSent = false;
        for (const btn of modalSendButtons) {
          const text = await btn.evaluate(el => el.innerText.trim());
          if (text && text.includes('送信')) {
            await btn.click();
            modalSent = true;
            logTime('ポップアップ内の送信ボタンをクリックしました');
            break;
          }
        }
        if (!modalSent) {
          logTime('ポップアップ内の送信ボタンが見つかりませんでした');
          continue;
        }
        // 送信後少し待機
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        logTime('ポップアップは表示されませんでした、または処理中にエラー: ' + e.message);
      }
      logTime('コメント送信完了');
      // コメント送信に成功した場合、記事のURLとタイトルをログ出力
      const pageTitle = await page.title(); // 記事タイトルを取得
      console.log(`【コメント成功】URL: ${articleUrl} タイトル: ${pageTitle}`); // ログ出力
      // 記録を追加
      commentedArticles.push({ url: articleUrl, title: pageTitle, date: new Date().toISOString() });
      saveCommentedArticles(commentedArticles);
      commentedCount++;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (commentedCount === 0) {
    logTime('どの記事にもコメントできませんでした');
  } else {
    logTime(`${commentedCount}件コメントを投稿しました`);
  }

  await browser.close();
  logTime('ブラウザを閉じました');
})();
