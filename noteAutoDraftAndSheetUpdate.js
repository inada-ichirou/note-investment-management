// 投稿一覧管理表.md で下書き保存日がからのものをNoteに下書き保存する

// Lambda本番用 + ローカルテスト両対応のnote自動投稿スクリプト
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
require('dotenv').config();
const isFly = !!process.env.FLY_APP_NAME; // Fly.io環境判定を追加

// --- Puppeteerのrequire方法 ---
// Renderなどのクラウド環境ではpuppeteer本体を使う必要があるため、puppeteerをrequireします。
// GitHub Actionsなどでpuppeteer-coreを使いたい場合は、適宜切り替えてください。
// 例: process.env.PUPPETEER_EXECUTABLE_PATH で分岐するなど
const puppeteer = require('puppeteer');
// const puppeteer = require('puppeteer-core'); // ←GitHub Actions等でchromeを自前で用意する場合はこちら

let launchOptions;

if (isLambda) {
  // Lambda本番用
  const chromium = require('chrome-aws-lambda');
  launchOptions = async () => ({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });
} else {
  // ローカルテスト用 + Fly.io用
  const isCI = process.env.CI === 'true';
  console.log('process.env.CIの値:', process.env.CI);
  console.log('isCI:', isCI);
  console.log('isFly:', isFly);
  
  launchOptions = async () => ({
    headless: isLambda || isFly || isCI ? true : false,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-zygote',
      '--single-process',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--ignore-certificate-errors-spki-list',
      '--user-data-dir=/tmp/chrome-user-data',
      '--data-path=/tmp/chrome-data-path',
      '--homedir=/tmp',
      '--disk-cache-dir=/tmp/chrome-cache-dir'
    ],
    defaultViewport: null
  });
}

const fs = require('fs');
const path = require('path');

// 記事データ取得
function getArticleData(articlePath) {
  // ファイル名からタイトルを抽出
  const fileName = path.basename(articlePath, '.md');
  // 例: 31__2025-05-25-引き寄せの法則で億万長者になった最強の秘密
  const match = fileName.match(/^\d+__\d{4}-\d{2}-\d{2}-(.+)$/);
  const title = match ? match[1] : fileName;
  const body = fs.readFileSync(articlePath, 'utf-8');
  return { title, body };
}

// サムネイル画像をランダム選択
function getRandomThumbnail() {
  const dir = path.join(__dirname, 'thumbnails');
  const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
  if (files.length === 0) throw new Error('サムネイル画像がありません');
  const file = files[Math.floor(Math.random() * files.length)];
  return path.join(dir, file);
}

// Puppeteerで画像ドラッグ＆ドロップ（画像を追加ボタンに対して）
async function dragAndDropToAddButton(page) {
  try {
    const dropSelector = 'button[aria-label="画像を追加"]';
    await page.waitForSelector(dropSelector, { timeout: 5000 });

    const filePath = getRandomThumbnail();
    const fileName = path.basename(filePath);
    const fileData = fs.readFileSync(filePath);
    const fileBase64 = fileData.toString('base64');
    console.log('ドラッグ＆ドロップでアップロードする画像ファイル:', filePath);

    await page.evaluate(async (dropSelector, fileName, fileBase64) => {
      const dropArea = document.querySelector(dropSelector);
      if (!dropArea) {
        throw new Error('ドロップエリアが見つかりません');
      }
      const bstr = atob(fileBase64);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--) u8arr[n] = bstr.charCodeAt(n);
      const file = new File([u8arr], fileName, { type: "image/jpeg" });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      // dragover
      const dragOverEvent = new DragEvent('dragover', {
        dataTransfer,
        bubbles: true,
        cancelable: true
      });
      dropArea.dispatchEvent(dragOverEvent);
      // drop
      const dropEvent = new DragEvent('drop', {
        dataTransfer,
        bubbles: true,
        cancelable: true
      });
      dropArea.dispatchEvent(dropEvent);
    }, dropSelector, fileName, fileBase64);
    console.log('ドラッグ＆ドロップによる画像アップロードを実行しました:', filePath);

    // 画像アップロード後の「保存」ボタンをモーダル内で探して複合マウスイベントでクリック
    try {
      // --- 画像アップロード後の保存処理を安定化するための待機処理 ---
      // 1. 画像プレビュー(imgタグ)がモーダル内に表示されるまで待機
      //    これにより、画像アップロードが完了してから保存ボタンを押すことができる
      console.log('画像プレビュー(imgタグ)がモーダル内に表示されるのを待機します...');
      await page.waitForSelector('.ReactModal__Content img', { timeout: 15000 });
      console.log('画像プレビュー(imgタグ)が表示されました');

      // 2. 「保存」ボタンが有効（disabled属性やaria-disabledがfalse）になるまで待機
      //    これにより、ボタンが押せる状態になるまで確実に待つことができる
      console.log('「保存」ボタンが有効になるのを待機します...');
      await page.waitForFunction(() => {
        const modal = document.querySelector('.ReactModal__Content');
        if (!modal) return false;
        const btns = Array.from(modal.querySelectorAll('button'));
        return btns.some(btn => btn.innerText.trim() === '保存' && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true');
      }, { timeout: 15000 });
      console.log('「保存」ボタンが有効になりました');

      // 3. モーダル内の全ボタンを取得し、デバッグ出力
      const modalButtons = await page.$$('.ReactModal__Content button');
      console.log('モーダル内のボタン数:', modalButtons.length);
      for (let i = 0; i < modalButtons.length; i++) {
        const html = await modalButtons[i].evaluate(el => el.outerHTML);
        console.log(`モーダル内ボタン[${i}] outerHTML:`, html);
      }
      let clicked = false;
      for (const btn of modalButtons) {
        // ボタンのinnerTextをデバッグ出力
        const text = await btn.evaluate(el => el.innerText.trim());
        console.log('モーダル内ボタンテキスト:', text);
        if (text === '保存') {
          // クリック前に画面内にスクロール
          await btn.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
          // ボタンの有効状態を再確認
          const isDisabled = await btn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true');
          console.log('保存ボタンのdisabled状態:', isDisabled);
          if (isDisabled) {
            console.error('保存ボタンが無効化されています');
            continue;
          }
          // PuppeteerのElementHandle.click()でクリック（delay付き）
          // これにより、実際のユーザー操作に近い形でクリックイベントが発火する
          await btn.click({ delay: 100 });
          clicked = true;
          break;
        }
      }
      if (clicked) {
        console.log('画像アップロード後の「保存」ボタン（モーダル内）をElementHandle.click()でクリックしました');
        // クリック後、モーダルが消える/非表示になるまで待機
        // これにより、保存処理が完了し次の処理に進めることを保証する
        await page.waitForFunction(() => {
          const modal = document.querySelector('.ReactModal__Content');
          return !modal || modal.offsetParent === null || window.getComputedStyle(modal).display === 'none' || window.getComputedStyle(modal).opacity === '0';
        }, { timeout: 15000 });
        console.log('画像アップロード後のモーダルが閉じました');
      } else {
        console.error('画像アップロード後の「保存」ボタン（モーダル内）が見つかりませんでした');
      }
    } catch (e) {
      console.error('画像アップロード後の「保存」ボタン（モーダル内）のクリック処理中にエラー:', e);
    }
  } catch (e) {
    console.error('ドラッグ＆ドロップ画像アップロード中にエラー:', e);
  }
}
exports.dragAndDropToAddButton = dragAndDropToAddButton;

// ログイン処理
async function login(page, email, password) {
  console.log('noteログインページへ遷移します');
  await page.goto('https://note.com/login?redirectPath=https%3A%2F%2Fnote.com%2F', { waitUntil: 'networkidle2' });
  console.log('メールアドレスとパスワードを入力します');
  await page.type('#email', email);
  await page.type('#password', password);
  await page.waitForSelector('button[type="button"]:not([disabled])');
  console.log('ログインボタンを探します');
  const buttons = await page.$$('button[type="button"]');
  for (const btn of buttons) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text && text.trim() === 'ログイン') {
      console.log('ログインボタンをクリックします');
      await btn.click();
      break;
    }
  }
  await page.waitForNavigation();
  console.log('ログイン完了');
  // ログイン後のURLとタイトルを出力
  console.log('ログイン後の現在のURL:', await page.url());
  console.log('ログイン後の現在のタイトル:', await page.title());
  // ユーザーアイコンが表示されているかチェック（ログイン判定）
  const userIcon = await page.$('img.a-userIcon--medium');
  if (userIcon) {
    // ユーザーアイコンの画像URLを取得してログ出力
    const iconUrl = await userIcon.evaluate(el => el.src);
    console.log('ユーザーアイコンが検出されました。ログイン成功です。画像URL:', iconUrl);
  } else {
    console.error('ユーザーアイコンが見つかりません。ログインに失敗した可能性があります。');
    process.exit(1);
  }
  // ログイン直後にユーザーポップアップがあれば閉じる
  const popupCloseBtn = await page.$('button.o-userPopup__close[aria-label="閉じる"]');
  if (popupCloseBtn) {
    console.log('ユーザーポップアップが表示されているため閉じます');
    await popupCloseBtn.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('ユーザーポップアップを閉じました');
  } else {
    console.log('ユーザーポップアップは表示されていません');
  }
  // ポップアップの有無にかかわらず2秒待機してから次の処理へ
  await new Promise(resolve => setTimeout(resolve, 2000));
}
exports.login = login;

// 投稿画面遷移
async function goToNewPost(page) {
  console.log('ユーザーポップアップがあれば閉じます');
  const closePopupBtn = await page.$('button.o-userPopup__close[aria-label="閉じる"]');
  if (closePopupBtn) {
    await closePopupBtn.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('ユーザーポップアップを閉じました');
  }
  // 投稿ボタン
  console.log('投稿ボタンを探します...');
  const postButtons = await page.$$('button[aria-label="投稿"]');
  let clicked = false;
  for (const btn of postButtons) {
    // ボタンのinnerTextとouterHTMLをデバッグ出力
    const innerText = await btn.evaluate(el => el.innerText);
    const outerHTML = await btn.evaluate(el => el.outerHTML);
    console.log('投稿ボタンinnerText:', innerText);
    console.log('投稿ボタンouterHTML:', outerHTML);
    if (await btn.isIntersectingViewport()) {
      console.log('表示されている投稿ボタンをhover→クリックします。');
      await btn.hover();
      await new Promise(resolve => setTimeout(resolve, 500));
      await btn.click();
      clicked = true;
      // 投稿ボタンクリック後のURLとタイトルを出力
      console.log('投稿ボタンクリック後のURL:', await page.url());
      console.log('投稿ボタンクリック後のタイトル:', await page.title());
      // 投稿ボタンクリック直後にスクリーンショットを保存
      // try {
      //   await page.screenshot({ path: 'after_post_btn.png' });
      //   console.log('投稿ボタンクリック後のスクリーンショットを保存しました（after_post_btn.png）');
      // } catch (e) {
      //   console.error('スクリーンショット保存に失敗:', e);
      // }
      // 全リンクを出力
      try {
        const links = await page.$$eval('a', as => as.map(a => ({href: a.getAttribute('href'), text: a.textContent.trim()})));
        // console.log('投稿ボタンクリック後の全リンク:', links);
      } catch (e) {
        console.error('全リンク出力に失敗:', e);
      }
      // page.contentの一部を出力
      try {
        const html = await page.content();
        console.log('投稿ボタンクリック後のHTMLの一部:', html.slice(0, 1000));
      } catch (e) {
        console.error('HTML出力に失敗:', e);
      }
      break;
    }
  }
  if (!clicked) {
    const html = await page.content();
    console.error('表示されている投稿ボタンが見つかりませんでした。HTMLの一部:', html.slice(0, 1000));
    throw new Error('表示されている投稿ボタンが見つかりませんでした');
  }

  // 投稿ボタンクリック後、新しく記事を書くボタンが表示されるかどうかを確認
  console.log('投稿ボタンクリック後、新しく記事を書くボタンが表示されるか確認します...');
  // クリック直後に1.5秒待機
  await new Promise(resolve => setTimeout(resolve, 1500));

  let newNoteButton = null;
  for (let i = 0; i < 5; i++) { // 最大5回リトライ（1秒ごと）
    newNoteButton = await page.$('a[href="/notes/new"]');
    if (newNoteButton) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (newNoteButton) {
    console.log('新しく記事を書くボタンが表示されました。クリックします。');
    await newNoteButton.click();
  } else {
    // 従来のテキストメニューを探す
    console.log('新しく記事を書くボタンが表示されませんでした。従来のテキストメニューをリトライで探します...');
    let found = false;
    for (let i = 0; i < 5; i++) {
      try {
        await page.waitForSelector('a[href="/notes/new"]', { timeout: 1000 });
        await page.click('a[href="/notes/new"]');
        found = true;
        break;
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    if (!found) {
      const html = await page.content();
      console.error('従来のテキストメニューが見つかりませんでした。HTMLの一部:', html.slice(0, 1000));
      throw new Error('新規投稿画面への遷移に失敗しました');
    }
  }
  await page.waitForNavigation();
  console.log('新規投稿画面に遷移しました');
}
exports.goToNewPost = goToNewPost;

// 記事入力
async function fillArticle(page, title, body) {
  console.log('タイトル入力欄を探します');
  await page.waitForSelector('textarea[placeholder="記事タイトル"]');
  const titleAreas = await page.$$('textarea[placeholder="記事タイトル"]');
  if (titleAreas.length > 0) {
    await titleAreas[0].focus();
    await titleAreas[0].click({ clickCount: 3 });
    await titleAreas[0].press('Backspace');
    await titleAreas[0].type(title);
    console.log('タイトルを入力しました');
  } else {
    throw new Error('タイトル入力欄が見つかりませんでした');
  }
  console.log('本文入力欄を探します');
  await page.waitForSelector('div.ProseMirror.note-common-styles__textnote-body[contenteditable="true"]');
  const bodyArea = await page.$('div.ProseMirror.note-common-styles__textnote-body[contenteditable="true"]');
  if (bodyArea) {
    await bodyArea.focus();
    await bodyArea.click({ clickCount: 3 });
    await bodyArea.press('Backspace');
    await bodyArea.type(body);
    console.log('本文を入力しました');
  } else {
    throw new Error('本文入力欄が見つかりませんでした');
  }
}
exports.fillArticle = fillArticle;

// 下書き保存
async function saveDraft(page) {
  console.log('「下書き保存」ボタンを探します...');
  await page.waitForSelector('button');
  const draftButtons = await page.$$('button');
  let draftSaved = false;
  for (const btn of draftButtons) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text && text.trim().includes('下書き保存')) {
      await btn.click();
      draftSaved = true;
      console.log('「下書き保存」ボタンをクリックしました');
      break;
    }
  }
  if (!draftSaved) {
    throw new Error('「下書き保存」ボタンが見つかりませんでした');
  }
}
exports.saveDraft = saveDraft;

// 閉じる処理
async function closeDialogs(page) {
  // 1回目
  console.log('「閉じる」ボタン（1回目）を探します...');
  await new Promise(resolve => setTimeout(resolve, 500));
  const closeButtons1 = await page.$$('button');
  let closed1 = false;
  for (const btn of closeButtons1) {
    const text = await (await btn.getProperty('innerText')).jsonValue();
    if (text && text.trim() === '閉じる') {
      await btn.click();
      closed1 = true;
      console.log('「閉じる」ボタン（1回目）をクリックしました');
      break;
    }
  }
  if (!closed1) {
    console.warn('「閉じる」ボタン（1回目）が見つかりませんでしたが、処理を続行します');
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  // 2回目（モーダル内）
  console.log('「閉じる」ボタン（2回目/モーダル内）を探します...');
  let closed2 = false;
  for (let retry = 0; retry < 5; retry++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const closeButtons2 = await page.$$('.ReactModal__Content button');
    for (const btn of closeButtons2) {
      const text = await (await btn.getProperty('innerText')).jsonValue();
      if (text && text.trim() === '閉じる') {
        await btn.click();
        closed2 = true;
        console.log('「閉じる」ボタン（2回目/モーダル内）をクリックしました');
        break;
      }
    }
    if (closed2) break;
  }
  if (!closed2) {
    console.warn('「閉じる」ボタン（2回目/モーダル内）が見つかりませんでしたが、処理を続行します');
  }
  await new Promise(resolve => setTimeout(resolve, 500));
}
exports.closeDialogs = closeDialogs;

// 投稿一覧管理表.mdをパースし、下書き保存日が空欄の行のファイル名リストを返す
function parseUnsubmittedArticles(tablePath) {
  const raw = fs.readFileSync(tablePath, 'utf-8');
  const lines = raw.split('\n');
  // テーブル部分のみ抽出
  const tableLines = lines.filter(line => line.trim().startsWith('|'));
  if (tableLines.length < 3) return [];
  const header = tableLines[0].split('|').map(h => h.trim());
  const fileNameIdx = header.findIndex(h => h === 'ファイル名');
  const draftDateIdx = header.findIndex(h => h === '下書き保存日');
  if (fileNameIdx === -1 || draftDateIdx === -1) return [];
  const result = [];
  for (let i = 2; i < tableLines.length; i++) { // データ行のみ
    const cols = tableLines[i].split('|').map(c => c.trim());
    if (!cols[draftDateIdx] && cols[fileNameIdx]) {
      // posts/ で始まらない場合は自動で付与
      let filePath = cols[fileNameIdx];
      if (!filePath.startsWith('posts/')) filePath = 'posts/' + filePath;
      result.push({
        filePath,
        rowIndex: i, // テーブル行番号（後で更新用に使う）
      });
    }
  }
  return result;
}

// 管理表の該当行の下書き保存日を更新する
function updateDraftDate(tablePath, rowIndex, dateStr) {
  const raw = fs.readFileSync(tablePath, 'utf-8');
  const lines = raw.split('\n');
  // テーブル部分のみ抽出
  const tableLines = lines.filter(line => line.trim().startsWith('|'));
  if (rowIndex >= tableLines.length) return;
  const cols = tableLines[rowIndex].split('|');
  // 下書き保存日カラムのインデックスを取得
  const header = tableLines[0].split('|').map(h => h.trim());
  const draftDateIdx = header.findIndex(h => h === '下書き保存日');
  if (draftDateIdx === -1) return;
  // カラム数が足りない場合は拡張
  while (cols.length <= draftDateIdx) cols.push('');
  cols[draftDateIdx] = ' ' + dateStr + ' ';
  tableLines[rowIndex] = cols.join('|');
  // テーブル部分を元のlinesに戻す
  let t = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|')) {
      lines[i] = tableLines[t++];
    }
  }
  fs.writeFileSync(tablePath, lines.join('\n'), 'utf-8');
}

// メイン処理
async function main() {
  console.log('Puppeteer起動オプションを取得します');
  const options = await launchOptions();
  console.log('Puppeteerを起動します');
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();

  // 管理表パス
  const tablePath = path.join(__dirname, './投稿一覧管理表.md');
  // 未下書き記事リスト取得
  const unsubmitted = parseUnsubmittedArticles(tablePath);
  if (unsubmitted.length === 0) {
    console.log('下書き保存待ちの記事はありません');
    process.exit(0);
  }

  // ログインは1回だけ
  await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);

  try {
    for (const { filePath, rowIndex } of unsubmitted) {
      try {
        // 記事ごとにnoteトップページに遷移してから投稿ボタンを押す
        console.log('noteトップページに遷移します');
        await page.goto('https://note.com/', { waitUntil: 'networkidle2' });
        console.log('記事処理開始: ' + filePath);
        const articlePath = path.join(__dirname, './', filePath);
        let title, body;
        try {
          ({ title, body } = getArticleData(articlePath));
        } catch (e) {
          if (e.code === 'ENOENT') {
            console.log(`記事ファイルが見つかりません: ${articlePath}`);
            continue; // 次の記事へ
          } else {
            throw e;
          }
        }
        await goToNewPost(page);
        await dragAndDropToAddButton(page);
        await fillArticle(page, title, body);
        await saveDraft(page);
        await closeDialogs(page);
        // スクリーンショット保存
        // await page.screenshot({ path: `after_input_${rowIndex}.png`, fullPage: true });
        // console.log('スクリーンショットを保存しました: after_input_' + rowIndex + '.png');
        // 管理表に日付記入
        const today = new Date().toISOString().slice(0, 10);
        updateDraftDate(tablePath, rowIndex, today);
        console.log(`管理表の下書き保存日を更新: ${filePath} → ${today}`);
      } catch (e) {
        console.error(`記事処理失敗: ${filePath}`, e);
        throw e; // 途中でストップ
      }
    }
  } catch (e) {
    console.error('記事処理中にエラーが発生したため、処理を中断します:', e);
    await browser.close(); // 必要なら有効化
    return { status: 'error', error: e.toString() };
  }
  await browser.close();
  return { status: 'done' };
}

if (isLambda) {
  exports.handler = async (event) => {
    return await main();
  };
} else if (require.main === module) {
  main().then(() => console.log('完了')).catch(console.error);
} 
