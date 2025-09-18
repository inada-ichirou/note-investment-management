import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { getRandomUserAgent } from './userAgents.js';

dotenv.config();

(async () => {
  // コマンドライン引数を解析
  const args = process.argv.slice(2);
  const wantsBackground = args.includes('--bg');
  
  // --bgオプションを除いた引数からURLを取得
  const urlArgs = args.filter(arg => arg !== '--bg');
  const targetUrl = urlArgs[0];
  
  // デフォルトURL（引数がない場合）
  const defaultUrl = 'https://note.com/enginner_skill';
  
  // 使用するURLを決定
  const urlToUse = targetUrl || defaultUrl;
  
  console.log('【URL設定】');
  console.log('引数で指定されたURL:', targetUrl || 'なし');
  console.log('使用するURL:', urlToUse);
  
  // URLの形式をチェック
  if (!urlToUse.startsWith('https://note.com/')) {
    console.error('エラー: 有効なnote.comのURLを指定してください');
    console.error('例: node likeNotesByUrl.js https://note.com/enginner_skill');
    console.error('例: node likeNotesByUrl.js --bg https://note.com/enginner_skill');
    process.exit(1);
  }

  console.log('Puppeteer起動オプションを取得します');
  // 実行引数からheadlessを決定（--bg があればheadless、それ以外は可視）
  const isCI = process.env.CI === 'true';
  const headlessMode = wantsBackground ? 'new' : false;
  console.log('headlessモード:', headlessMode === false ? '可視(visible)' : 'バックグラウンド(headless)');
  console.log('process.env.CIの値:', process.env.CI);
  console.log('isCI:', isCI);
  
  // ランダムなUser-Agentを取得
  const randomUserAgent = getRandomUserAgent();
  console.log('使用するUser-Agent:', randomUserAgent);
  
  // ランダムなビューポートサイズを生成
  const viewportSizes = [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1280, height: 720 }
  ];
  const randomViewport = viewportSizes[Math.floor(Math.random() * viewportSizes.length)];
  console.log('使用するビューポートサイズ:', randomViewport);
  
  const browser = await puppeteer.launch({
    headless: headlessMode,
    defaultViewport: null, // ウインドウサイズをargsで指定するためnullに
    args: [
      `--window-size=${randomViewport.width},${randomViewport.height}`,
      '--incognito', // シークレットモード（プライベートモード）を強制
      '--no-first-run', // 初回実行時のセットアップをスキップ
      '--no-default-browser-check', // デフォルトブラウザチェックをスキップ
      '--disable-default-apps', // デフォルトアプリを無効化
      '--disable-background-mode', // バックグラウンドモードを無効化
      '--disable-background-networking', // バックグラウンドネットワーキングを無効化
      '--disable-background-timer-throttling', // バックグラウンドタイマー調整を無効化
      '--disable-backgrounding-occluded-windows', // 隠れたウィンドウのバックグラウンド化を無効化
      '--disable-renderer-backgrounding', // レンダラーのバックグラウンド化を無効化
      '--disable-features=TranslateUI', // 翻訳UIを無効化
      '--disable-ipc-flooding-protection', // IPCフラッディング保護を無効化
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images', // 画像読み込みを無効化して高速化
      '--disable-javascript-harmony-shipping',
      `--user-agent=${randomUserAgent}`
    ]
  });
  
  // ブラウザのページ数を確認
  const pages = await browser.pages();
  console.log('【ブラウザ起動時のページ数】:', pages.length);
  
  // 既存のページがある場合はそれを使用、なければ新規作成
  let page;
  if (pages.length > 0) {
    page = pages[0]; // 最初のページを使用
    console.log('既存のページを使用します');
  } else {
    page = await browser.newPage();
    console.log('新しいページを作成しました');
  }
  
  // プライベートモードかどうかを検証
  console.log('【プライベートモード検証】');
  console.log('ブラウザコンテキストID:', page.browserContext().id);
  
  // ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー
  // // isIncognitoプロパティの存在確認
  // const browserContext = page.browserContext();
  // const isIncognito = browserContext.isIncognito !== undefined ? browserContext.isIncognito : 'プロパティなし';
  // console.log('browserContext:', browserContext);
  // console.log('browserContext.isIncognito:', isIncognito);
  // console.log('ブラウザコンテキストタイプ:', browserContext.isIncognito ? 'プライベート' : '通常');
  
  // // ブラウザコンテキストの詳細情報
  // console.log('ブラウザコンテキスト詳細:', {
  //   id: browserContext.id,
  //   hasIsIncognito: 'isIncognito' in browserContext,
  //   isIncognitoValue: browserContext.isIncognito
  // });
  
  // // browserContextのプロパティ一覧を取得
  // console.log('【browserContextプロパティ一覧】');
  // const contextProps = Object.getOwnPropertyNames(browserContext);
  // console.log('プロパティ名:', contextProps);
  
  // // プロトタイプのプロパティも取得
  // const prototypeProps = Object.getOwnPropertyNames(Object.getPrototypeOf(browserContext));
  // console.log('プロトタイププロパティ:', prototypeProps);
  
  // // 利用可能なメソッドを確認
  // const methods = contextProps.filter(prop => typeof browserContext[prop] === 'function');
  // console.log('利用可能なメソッド:', methods);
  
  // // プライベートモードの別の確認方法
  // console.log('【プライベートモード別確認方法】');
  
  // // 1. ブラウザの起動引数を確認
  // const browserArgs = await browser.process()?.spawnargs || [];
  // const hasIncognito = browserArgs.includes('--incognito');
  // console.log('--incognitoオプション:', hasIncognito ? 'あり' : 'なし');
  
  // // 2. ページのURLで確認（about:blank以外ならプライベートモードの可能性）
  // const currentUrl = page.url();
  // console.log('現在のURL:', currentUrl);
  
  // // 3. ブラウザのバージョン情報
  // const version = await browser.version();
  // console.log('ブラウザバージョン:', version);
  // ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー
  
  // ページの詳細情報を取得
  const pageInfo = await page.evaluate(() => {
    return {
      userAgent: navigator.userAgent,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      language: navigator.language,
      platform: navigator.platform,
      webdriver: navigator.webdriver,
      chrome: window.chrome ? '存在' : 'なし'
    };
  });
  
  console.log('ページ情報:', pageInfo);

  try {
    console.log('対象ページへ遷移します:', urlToUse);
    await page.goto(urlToUse, { waitUntil: 'networkidle2' });
    console.log('ページ遷移完了');

    // ページの読み込みを待つ
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 記事が表示されるまで少し待機
    console.log('記事の読み込みを待機中...');
    
    // デバッグ用：ページの内容を確認
    console.log('ページのタイトル:', await page.title());
    
    // デバッグ用：ボタン要素を探す
    const allButtons = await page.$$('button');
    console.log('ページ内のボタン数:', allButtons.length);
    
    // デバッグ用：aria-label属性を持つボタンを探す
    const buttonsWithAriaLabel = await page.$$('button[aria-label]');
    console.log('aria-label属性を持つボタン数:', buttonsWithAriaLabel.length);
    
    // デバッグ用：aria-labelの内容を確認
    for (let i = 0; i < Math.min(5, buttonsWithAriaLabel.length); i++) {
      const ariaLabel = await buttonsWithAriaLabel[i].evaluate(el => el.getAttribute('aria-label'));
      console.log(`ボタン${i + 1}のaria-label:`, ariaLabel);
    }
    
    // デバッグ用：実際のいいねボタンを探す
    // まず、aria-label="スキ"のボタンを探す
    let likeButtons = await page.$$('button[aria-label="スキ"]');
    console.log('aria-label="スキ"のボタン数:', likeButtons.length);
    
    // 見つからない場合は、SVG要素でハートマークを探す
    if (likeButtons.length === 0) {
      console.log('SVG要素でハートマークを探します');
      const heartSvg = await page.$$('svg[aria-label="スキ"]');
      console.log('ハートSVG要素数:', heartSvg.length);
      
      if (heartSvg.length > 0) {
        // SVGの親要素（ボタン）を取得
        likeButtons = await page.$$('button:has(svg[aria-label="スキ"])');
        console.log('ハートSVGを含むボタン数:', likeButtons.length);
      }
    }
    
    // まだ見つからない場合は、data-testidやclassで探す
    if (likeButtons.length === 0) {
      console.log('data-testidやclassでいいねボタンを探します');
      likeButtons = await page.$$('button[data-testid*="like"], button[data-testid*="heart"], button[class*="like"], button[class*="heart"]');
      console.log('data-testid/class検索結果:', likeButtons.length);
    }
    
    // デバッグ用：見つかったボタンの詳細を確認
    if (likeButtons.length > 0) {
      console.log('見つかったボタンの詳細:');
      for (let i = 0; i < Math.min(3, likeButtons.length); i++) {
        const ariaLabel = await likeButtons[i].evaluate(el => el.getAttribute('aria-label'));
        const className = await likeButtons[i].evaluate(el => el.className);
        const dataTestId = await likeButtons[i].evaluate(el => el.getAttribute('data-testid'));
        console.log(`ボタン${i + 1}: aria-label="${ariaLabel}", class="${className}", data-testid="${dataTestId}"`);
      }
    }
    
    // いいねボタンが見つからない場合は、スクロールして再試行
    if (likeButtons.length === 0) {
      console.log('いいねボタンが見つからないため、スクロールして再試行します');
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      likeButtons = await page.$$('button:has(svg[aria-label="スキ"])');
      console.log('スクロール後の「スキ」ボタン数:', likeButtons.length);
    }
    
    console.log('記事の読み込み完了');

    // 「もっとみる」ボタンをクリックして記事を読み込む
    console.log('「もっとみる」ボタンを探してクリックします');
    
    // まずページ下部までスクロール
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    
    // 「もっとみる」ボタンを探す（サイズがあるボタンを優先）
    const loadMoreButton = await page.evaluateHandle(() => {
      // まずbutton要素を探す
      const buttons = Array.from(document.querySelectorAll('button'));
      const loadMoreButtons = buttons.filter(btn => btn.textContent.includes('もっとみる'));
      
      // サイズがあるボタンを探す（getBoundingClientRectでwidth > 0のもの）
      let foundButton = loadMoreButtons.find(btn => {
        const rect = btn.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      
      // サイズがあるボタンが見つからない場合は最初のボタンを使用
      if (!foundButton && loadMoreButtons.length > 0) {
        foundButton = loadMoreButtons[0];
      }
      
      // button要素が見つからない場合はa要素を探す
      if (!foundButton) {
        const links = Array.from(document.querySelectorAll('a'));
        foundButton = links.find(link => link.textContent.includes('もっとみる'));
      }
      
      return foundButton;
    });
    
    if (loadMoreButton && loadMoreButton.asElement && loadMoreButton.asElement() !== null) {
      console.log('「もっとみる」ボタンが見つかりました。クリックします。');
      
      try {
        const buttonElement = loadMoreButton.asElement();
        
        // 要素の可視性をチェック
        const isVisible = await buttonElement.isIntersectingViewport();
        
        // ボタンがクリック可能かチェック
        const isClickable = await buttonElement.evaluate(btn => {
          const rect = btn.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && 
                 !btn.disabled && 
                 !btn.hasAttribute('disabled') &&
                 window.getComputedStyle(btn).pointerEvents !== 'none' &&
                 window.getComputedStyle(btn).visibility !== 'hidden' &&
                 window.getComputedStyle(btn).opacity !== '0';
        });
        
        if (isVisible && isClickable) {
          // JavaScriptでクリックイベントを発火
          await buttonElement.evaluate(btn => btn.click());
          console.log('「もっとみる」ボタンをクリックしました');
          
          // 新しい記事が読み込まれるまで待機
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.log('「もっとみる」ボタンがクリック不可能です');
        }
      } catch (error) {
        console.log('「もっとみる」ボタンのクリックでエラー:', error.message);
      }
    } else {
      console.log('「もっとみる」ボタンが見つかりませんでした');
    }
    
    console.log('「もっとみる」ボタンの処理完了');

    // 20回下までスクロールして記事を読み込む（より多くの記事を表示）
    for (let i = 0; i < 20; i++) {
      console.log(`下までスクロールします (${i + 1}/20)`);
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    }
    console.log('スクロール完了');

    // 「スキ」ボタン（button要素）をすべて取得
    likeButtons = await page.$$('button:has(svg[aria-label="スキ"])');
    console.log('取得した「スキ」ボタン数:', likeButtons.length);

    if (likeButtons.length === 0) {
      console.log('いいねできる記事が見つかりませんでした');
      await browser.close();
      return;
    }

    const maxLikes = 50; // 最大いいね数
    console.log(`最大${maxLikes}件のスキを付けます。`);

    let successCount = 0;
    let errorCount = 0;
    let processedCount = 0;

    for (let i = 0; i < likeButtons.length && successCount < maxLikes; i++) {
      try {
        processedCount++;
        console.log(`--- ${processedCount}件目処理中 (成功: ${successCount}/${maxLikes}) ---`);
        const btn = likeButtons[i];
        
        // クリック前の状態
        const ariaPressed = await btn.evaluate(el => el.getAttribute('aria-pressed'));
        
        // すでにいいね済みの場合はスキップ
        if (ariaPressed === 'true') {
          console.log('すでにいいね済みのためスキップします');
          continue;
        }
        
        // ボタンの親要素からタイトルと投稿者名を取得
        const info = await btn.evaluate((btn) => {
          let title = 'タイトル不明';
          let user = '投稿者不明';
          
          // 記事の親要素を探す（複数のパターンを試す）
          let articleElement = btn.closest('article') || 
                              btn.closest('[data-testid="note-card"]') ||
                              btn.closest('.m-largeNoteWrapper__card') ||
                              btn.closest('.o-noteCard');
          
          if (articleElement) {
            // タイトルを探す（複数のパターンを試す）
            const titleElem = articleElement.querySelector('h1, h2, h3, .m-noteBodyTitle__title, [data-testid="note-title"]') ||
                             articleElement.querySelector('a[href*="/n/"]') ||
                             articleElement.querySelector('.o-noteCard__title');
            if (titleElem) {
              title = titleElem.textContent.trim();
            }
            
            // 投稿者名を探す（複数のパターンを試す）
            const userElem = articleElement.querySelector('.o-largeNoteSummary__userName, .o-noteCard__userName, [data-testid="user-name"]') ||
                            articleElement.querySelector('a[href*="/@"]') ||
                            articleElement.querySelector('.o-noteCard__user');
            if (userElem) {
              user = userElem.textContent.trim();
            }
          }
          
          return { title, user };
        });
        console.log(`タイトル: ${info.title}｜投稿者: ${info.user}`);
        
        // CI環境でのみ待機時間を追加
        if (isCI) {
          console.log('CI環境のため、like処理前に2秒待機します');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // 要素の可視性をチェック
        let isVisible = await btn.isIntersectingViewport();
        
        if (!isVisible) {
          // ボタンが可視状態になるまでスクロール
          await btn.scrollIntoView();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 再度可視性をチェック
          isVisible = await btn.isIntersectingViewport();
          
          if (!isVisible) {
            console.log('いいねボタンが可視状態ではないためスキップします');
            continue;
          }
        }
        
        // 要素がクリック可能かチェック
        const isClickable = await btn.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && 
                 !el.disabled && 
                 !el.hasAttribute('disabled') &&
                 window.getComputedStyle(el).pointerEvents !== 'none';
        });
        
        if (!isClickable) {
          console.log('いいねボタンがクリック不可能なためスキップします');
          continue;
        }
        
        // JavaScriptでクリックイベントを発火
        await btn.evaluate(el => el.click());
        
        // CI環境でのみ追加の待機時間を設定
        const waitTimeout = isCI ? 10000 : 5000; // CI環境では10秒、ローカルでは5秒
        
        // クリック後、aria-pressedがtrueになるまで待機
        await page.waitForFunction(
          el => el.getAttribute('aria-pressed') === 'true',
          { timeout: waitTimeout },
          btn
        );
        console.log('いいね成功！');
        
        successCount++;
        
        // CI環境でのみlike処理後の待機時間を追加
        if (isCI) {
          console.log('CI環境のため、like処理後に1秒待機します');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 各いいねの間に少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`いいね処理でエラーが発生しました (${processedCount}件目):`, error.message);
        errorCount++;
        continue;
      }
    }
    
    console.log('【処理完了】');
    console.log(`成功: ${successCount}件`);
    console.log(`エラー: ${errorCount}件`);
    console.log(`合計処理: ${successCount + errorCount}件`);

  } catch (error) {
    console.error('ページ処理中にエラーが発生しました:', error.message);
  } finally {
    await browser.close();
    console.log('ブラウザを閉じました');
  }
})();

