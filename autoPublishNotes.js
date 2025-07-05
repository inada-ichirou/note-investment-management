require('dotenv').config();
const puppeteer = require('puppeteer');
const { login } = require('./noteAutoDraftAndSheetUpdate');
const { TwitterApi } = require('twitter-api-v2');

(async () => {
  const isCI = process.env.CI === 'true';
  console.log('Puppeteerを起動します');
  const browser = await puppeteer.launch({
    headless: isCI ? 'old' : false,
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
  console.log('User-Agentを設定します');
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  // ログイン
  console.log('noteにログインします');
  await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);
  console.log('ログイン完了');

  // ログイン後の状態を詳細に確認
  console.log('ログイン後の詳細な状態を確認します');
  const currentUrl = page.url();
  const currentTitle = await page.title();
  console.log('現在のURL:', currentUrl);
  console.log('現在のページタイトル:', currentTitle);
  
  // ページのHTML構造を部分的に確認
  try {
    const bodyContent = await page.evaluate(() => {
      const body = document.body;
      return body ? body.innerHTML.substring(0, 500) : 'body要素が見つかりません';
    });
    console.log('ページのbody要素の最初の500文字:', bodyContent);
  } catch (e) {
    console.log('ページ内容の取得に失敗:', e.message);
  }

  const draftUrl = 'https://note.com/notes?page=1&status=draft';
  console.log('下書き一覧ページへ遷移します:', draftUrl);
  
  // 遷移前の状態を記録
  console.log('遷移前のURL:', page.url());
  
  try {
    await page.goto(draftUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('下書き一覧ページに到達しました');
  } catch (e) {
    console.log('下書き一覧ページへの遷移に失敗:', e.message);
    const errorUrl = page.url();
    const errorTitle = await page.title();
    console.log('エラー時のURL:', errorUrl);
    console.log('エラー時のページタイトル:', errorTitle);
    throw e;
  }
  
  // 遷移後の状態を詳細に確認
  console.log('遷移後の詳細な状態を確認します');
  const afterUrl = page.url();
  const afterTitle = await page.title();
  console.log('遷移後のURL:', afterUrl);
  console.log('遷移後のページタイトル:', afterTitle);
  
  // ページ読み込み完了を待機します（1.5秒）
  await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5秒待機

  // JavaScriptによる動的読み込みを待機
  console.log('JavaScriptによる動的読み込みを待機します');
  try {
    // ページが完全に読み込まれるまで待機（最大10秒）
    await page.waitForFunction(
      () => {
        // ページの読み込み状態を確認
        const readyState = document.readyState;
        const hasContent = document.body && document.body.innerHTML.length > 100000;
        return readyState === 'complete' && hasContent;
      },
      { timeout: 10000 }
    );
    console.log('ページの動的読み込みが完了しました');
  } catch (e) {
    console.log('動的読み込みの待機がタイムアウトしました:', e.message);
  }

  // 追加の待機時間
  console.log('追加で3秒待機します');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // ページの状態をさらに詳細に確認
  console.log('ページの詳細な状態を確認します');
  try {
    const pageContent = await page.evaluate(() => {
      const content = document.documentElement.innerHTML;
      return {
        hasContent: content.length > 0,
        contentLength: content.length,
        hasArticleList: content.includes('o-articleList'),
        hasArticleItem: content.includes('o-articleList__item'),
        bodyClasses: document.body ? document.body.className : 'body要素なし',
        headTitle: document.title,
        // 新しい調査項目を追加
        hasNuxtContent: content.includes('__nuxt'),
        hasReactContent: content.includes('react'),
        hasVueContent: content.includes('vue'),
        hasLoadingIndicator: content.includes('loading') || content.includes('spinner'),
        hasErrorMessage: content.includes('error') || content.includes('エラー'),
        hasEmptyState: content.includes('empty') || content.includes('記事がありません') || content.includes('下書きがありません'),
        // ページの主要な構造を確認
        mainContentClasses: (() => {
          const mainElements = document.querySelectorAll('main, [role="main"], .main, .content, .container');
          return Array.from(mainElements).map(el => el.className).slice(0, 5);
        })(),
        // 全体のクラス名を調査（記事関連以外も含む）
        allUniqueClasses: (() => {
          const elements = document.querySelectorAll('*[class]');
          const classes = new Set();
          elements.forEach(el => {
            el.className.split(' ').forEach(cls => {
              if (cls && (cls.includes('list') || cls.includes('item') || cls.includes('note') || cls.includes('draft'))) {
                classes.add(cls);
              }
            });
          });
          return Array.from(classes).slice(0, 30);
        })()
      };
    });
    console.log('ページ内容の詳細:', JSON.stringify(pageContent, null, 2));
  } catch (e) {
    console.log('ページ内容の詳細確認に失敗:', e.message);
  }

  // ページのHTMLの一部を出力（デバッグ用）
  console.log('ページのHTML構造を調査します');
  try {
    const htmlSample = await page.evaluate(() => {
      const body = document.body;
      if (!body) return 'body要素が見つかりません';
      
      // bodyの直接の子要素を確認
      const children = Array.from(body.children).map(child => ({
        tagName: child.tagName,
        className: child.className,
        id: child.id,
        childrenCount: child.children.length
      }));
      
      return {
        bodyChildren: children,
        bodyHTML: body.innerHTML.substring(0, 2000) // 最初の2000文字
      };
    });
    console.log('HTML構造の詳細:', JSON.stringify(htmlSample, null, 2));
  } catch (e) {
    console.log('HTML構造の調査に失敗:', e.message);
  }

  // 下書き記事リストを取得
  console.log('下書き記事リストを取得します');
  console.log('セレクター "div.o-articleList__item" で要素を検索します');
  
  let articles = [];
  try {
    articles = await page.$$('div.o-articleList__item');
    console.log(`下書き記事を${articles.length}件検出しました`);
  } catch (e) {
    console.log('記事リストの取得に失敗:', e.message);
  }
  
  // 記事が見つからない場合の追加調査
  if (articles.length === 0) {
    console.log('記事が見つからないため、追加調査を行います');
    
    // より包括的なセレクター調査
    console.log('=== 包括的なセレクター調査を開始 ===');
    
    // 1. リスト系の要素を調査
    const listSelectors = [
      'ul', 'ol', 'div[class*="list"]', 'div[class*="List"]',
      'section[class*="list"]', 'section[class*="List"]',
      '[data-testid*="list"]', '[data-testid*="List"]'
    ];
    
    for (const selector of listSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`リスト系セレクター "${selector}" で ${elements.length} 件の要素を検出`);
          // 最初の要素の詳細情報
          const firstElementInfo = await elements[0].evaluate(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            childrenCount: el.children.length,
            textContent: el.textContent ? el.textContent.substring(0, 100) : ''
          }));
          console.log('最初の要素の詳細:', JSON.stringify(firstElementInfo, null, 2));
        }
      } catch (e) {
        console.log(`セレクター "${selector}" での検索に失敗:`, e.message);
      }
    }
    
    // 2. 記事系の要素を調査（より広範囲）
    const articleSelectors = [
      'article', '[class*="article"]', '[class*="Article"]',
      '[class*="note"]', '[class*="Note"]',
      '[class*="post"]', '[class*="Post"]',
      '[class*="item"]', '[class*="Item"]',
      '[class*="card"]', '[class*="Card"]',
      '[data-testid*="article"]', '[data-testid*="note"]'
    ];
    
    for (const selector of articleSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`記事系セレクター "${selector}" で ${elements.length} 件の要素を検出`);
          // 最初の要素の詳細情報
          const firstElementInfo = await elements[0].evaluate(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            childrenCount: el.children.length,
            textContent: el.textContent ? el.textContent.substring(0, 100) : ''
          }));
          console.log('最初の要素の詳細:', JSON.stringify(firstElementInfo, null, 2));
        }
      } catch (e) {
        console.log(`セレクター "${selector}" での検索に失敗:`, e.message);
      }
    }
    
    // 3. data属性を持つ要素を調査
    console.log('=== data属性を持つ要素を調査 ===');
    try {
      const dataElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('[data-testid], [data-cy], [data-qa], [data-automation]');
        return Array.from(elements).slice(0, 10).map(el => ({
          tagName: el.tagName,
          className: el.className,
          dataTestId: el.getAttribute('data-testid'),
          dataCy: el.getAttribute('data-cy'),
          dataQa: el.getAttribute('data-qa'),
          dataAutomation: el.getAttribute('data-automation'),
          textContent: el.textContent ? el.textContent.substring(0, 50) : ''
        }));
      });
      console.log('data属性を持つ要素:', JSON.stringify(dataElements, null, 2));
    } catch (e) {
      console.log('data属性の調査に失敗:', e.message);
    }
    
    // 4. 現在のページが空の状態かどうかを確認
    console.log('=== 空の状態チェック ===');
    try {
      const emptyStateCheck = await page.evaluate(() => {
        const text = document.body.textContent || '';
        return {
          hasEmptyMessage: text.includes('記事がありません') || text.includes('下書きがありません') || text.includes('投稿がありません'),
          hasNoDataMessage: text.includes('データがありません') || text.includes('まだありません'),
          hasCreateButton: text.includes('記事を書く') || text.includes('新規作成'),
          bodyTextSample: text.substring(0, 500)
        };
      });
      console.log('空の状態チェック結果:', JSON.stringify(emptyStateCheck, null, 2));
    } catch (e) {
      console.log('空の状態チェックに失敗:', e.message);
    }
    
    // 他の可能性のあるセレクターを試す
    const alternativeSelectors = [
      '.o-articleList__item',
      '[class*="articleList"]',
      '[class*="article"]',
      'article',
      'li[class*="article"]',
      'div[class*="article"]'
    ];
    
    for (const selector of alternativeSelectors) {
      try {
        const elements = await page.$$(selector);
        console.log(`セレクター "${selector}" で ${elements.length} 件の要素を検出`);
        if (elements.length > 0) {
          // 最初の要素のクラス名を確認
          const firstElementClass = await elements[0].evaluate(el => el.className);
          console.log(`最初の要素のクラス名: ${firstElementClass}`);
        }
      } catch (e) {
        console.log(`セレクター "${selector}" での検索に失敗:`, e.message);
      }
    }
    
    // ページ全体のクラス名を確認
    try {
      const allClasses = await page.evaluate(() => {
        const elements = document.querySelectorAll('*[class]');
        const classes = new Set();
        elements.forEach(el => {
          el.className.split(' ').forEach(cls => {
            if (cls && cls.includes('article')) {
              classes.add(cls);
            }
          });
        });
        return Array.from(classes).slice(0, 20); // 最大20個まで
      });
      console.log('記事関連のクラス名:', allClasses);
    } catch (e) {
      console.log('クラス名の調査に失敗:', e.message);
    }
    
    // ページのスクリーンショットを撮影（デバッグ用）
    if (!isCI) {
      try {
        await page.screenshot({ path: 'debug_draft_page.png', fullPage: true });
        console.log('デバッグ用スクリーンショットを保存しました: debug_draft_page.png');
      } catch (e) {
        console.log('スクリーンショットの保存に失敗:', e.message);
      }
    }
  }

  const POST_LIMIT = 1; // 投稿数の上限（必要に応じて変更）
  let postCount = 0;
  // 下書き記事リストの一番最後（最新）から投稿するよう逆順ループに変更
  for (let i = articles.length - 1; i >= 0; i--) {
    if (postCount >= POST_LIMIT) break;
    const li = articles[i];
    console.log(`${i + 1}件目の記事タイトルを取得します`);
    const title = await li.$eval('.o-articleList__heading', el => el.textContent.trim());
    console.log(`記事タイトル: ${title}`);
    if (title.startsWith('S-')) {
      console.log(`スキップ: ${title}`);
      continue;
    }
    console.log(`投稿準備: ${title}`);
    // 編集ボタンをクリック
    console.log('編集ボタンをクリックします');
    const editBtn = await li.$('.o-articleList__link');
    await editBtn.click();
    console.log('記事編集ページへの遷移を待機します');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.waitForSelector('button', {timeout: 10000});

    // 「公開に進む」ボタンを探してクリック
    console.log('「公開に進む」ボタンを探します');
    await page.waitForSelector('button', {timeout: 10000});
    const publishBtns = await page.$$('button');
    let publishBtn = null;
    for (const btn of publishBtns) {
      const text = await btn.evaluate(el => el.innerText.trim());
      if (text && text.includes('公開に進む')) {
        publishBtn = btn;
        break;
      }
    }
    if (publishBtn) {
      console.log('「公開に進む」ボタンをクリックします');
      // 画面内に移動
      const isInView = await publishBtn.isIntersectingViewport();
      if (!isInView) {
        await publishBtn.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
      }
      // 本当のユーザー操作をエミュレートしてクリック
      await page.evaluate(el => {
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }, publishBtn);
      // クリック後に2秒待機
      await new Promise(resolve => setTimeout(resolve, 2000));
      // 「投稿する」ボタンが現れるまで最大10秒待機
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll('button')).some(btn => btn.textContent && btn.textContent.includes('投稿する')),
        { timeout: 10000 }
      );
      await new Promise(resolve => setTimeout(resolve, 300)); // 追加で少し待機
    } else {
      console.log('「公開に進む」ボタンが見つかりません');
      console.log('下書き一覧ページに戻ります');
      await page.goto(draftUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      continue;
    }

    await page.waitForSelector('button', {timeout: 10000});
    // 「投稿する」ボタンを探してクリック
    console.log('「投稿する」ボタンを探します');
// デバッグ用なので一旦コメントアウト
    // // デバッグ用: 全ボタンのテキストを出力
    const postBtns = await page.$$('button');
    // for (const btn of postBtns) {
    //   const text = await btn.evaluate(el => el.innerText.trim());
    //   console.log('ボタンテキスト:', text);
    // }
    let postBtn = null;
    for (const btn of postBtns) {
      const text = await btn.evaluate(el => el.innerText.trim());
      if (text && text.includes('投稿する')) {
        postBtn = btn;
        break;
      }
    }
    if (postBtn) {
      console.log('「投稿する」ボタンをクリックします');
      const isInView = await postBtn.isIntersectingViewport();
      if (!isInView) {
        await postBtn.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
      }
      await page.evaluate(el => {
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }, postBtn);
      // 投稿完了ダイアログの「閉じる」ボタンを待機してクリック
      try {
        console.log('投稿完了ダイアログの「閉じる」ボタンを待機します');
        await page.waitForSelector('button[aria-label="閉じる"]', {timeout: 15000});
        const closeBtn = await page.$('button[aria-label="閉じる"]');
        if (closeBtn) {
          console.log('「閉じる」ボタンをクリックします');
          await closeBtn.click();
        } else {
          console.log('「閉じる」ボタンが見つかりません');
        }
      } catch (e) {
        console.log('「閉じる」ボタンが表示されませんでした');
      }
      console.log(`記事を投稿しました: ${title}`);
      // ここからTwitter自動投稿処理
      try {
        // デバッグ用: .envから読み込んだ値を一部表示（先頭4文字のみ）
        // console.log('TWITTER_API_KEY:', process.env.TWITTER_API_KEY?.slice(0,4), '...');
        // console.log('TWITTER_API_SECRET:', process.env.TWITTER_API_SECRET?.slice(0,4), '...');
        // console.log('TWITTER_ACCESS_TOKEN:', process.env.TWITTER_ACCESS_TOKEN?.slice(0,4), '...');
        // console.log('TWITTER_ACCESS_SECRET:', process.env.TWITTER_ACCESS_SECRET?.slice(0,4), '...');
        // 記事のURLを取得
        const currentUrl = page.url();
        console.log('currentUrl:', currentUrl);
        // ツイート内容を確認
        const tweetText = currentUrl.includes('note.com')
          ? `note記事を公開しました！\n${title}\n${currentUrl}`
          : `note記事を公開しました！\n${title}`;
        console.log('tweetText:', tweetText);
        // Twitterクライアント初期化
        const twitterClient = new TwitterApi({
          appKey: process.env.TWITTER_API_KEY,
          appSecret: process.env.TWITTER_API_SECRET,
          accessToken: process.env.TWITTER_ACCESS_TOKEN,
          accessSecret: process.env.TWITTER_ACCESS_SECRET,
        });
        console.log('TwitterApiクライアント初期化完了');

        await twitterClient.v2.tweet({
          text: tweetText
        });
        console.log('Twitterにも自動投稿しました:', tweetText);
      } catch (e) {
        console.error('Twitter自動投稿に失敗:', e);
      }
      // ここまでTwitter自動投稿処理
      postCount++;
    } else {
      console.log('「投稿する」ボタンが見つかりません');
    }
    // 下書き一覧に戻る
    console.log('下書き一覧ページに戻ります');
    await page.goto(draftUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  await browser.close();
  console.log('自動記事投稿処理が完了しました');
})(); 
