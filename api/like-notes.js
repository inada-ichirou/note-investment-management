// 記事にいいねをするAPIエンドポイント
import puppeteer from 'puppeteer-core';
import fs from 'fs';

export default async function handler(req, res) {
  // GETとPOSTリクエストを許可
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== Like Notes API 実行開始 ===');
  console.log('Method:', req.method);
  console.log('実行時刻:', new Date().toISOString());

  try {
    // 環境変数チェック
    if (!process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
      throw new Error('NOTE_EMAIL or NOTE_PASSWORD is not set');
    }

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
    const index = (runsPerDay * dayOfYear + runIndex) % searchWords.length;
    const searchWord = searchWords[index];

    console.log(`選択された検索ワード: ${searchWord} (インデックス: ${index})`);

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
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--window-size=1280,900'
      ],
      timeout: 60000
    });

    const page = await browser.newPage();
    
    // User-Agent設定
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    // note.comにログイン
    console.log('note.comにログイン中...');
    await page.goto('https://note.com/login', { waitUntil: 'networkidle2' });
    
    await page.type('input[name="email"]', process.env.NOTE_EMAIL);
    await page.type('input[name="password"]', process.env.NOTE_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ログイン完了を待機
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('ログイン完了');

    // 検索ページに移動
    const searchUrl = `https://note.com/search?q=${encodeURIComponent(searchWord)}&sort=latest`;
    console.log(`検索ページへ遷移: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    console.log('検索ページに到達');

    // ページ読み込み完了を待機
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 記事一覧を取得
    const articles = await page.evaluate(() => {
      const articleElements = document.querySelectorAll('a[href*="/n/"]');
      return Array.from(articleElements, (el, index) => ({
        href: el.href,
        title: el.textContent?.trim() || `記事${index + 1}`,
        index
      })).slice(0, 10); // 最初の10記事のみ
    });

    console.log(`検索結果記事数: ${articles.length}`);

    let likeCount = 0;
    const maxLikes = 5; // 最大いいね数

    for (const article of articles) {
      if (likeCount >= maxLikes) break;

      try {
        console.log(`記事を開いています: ${article.title}`);
        await page.goto(article.href, { waitUntil: 'networkidle2' });
        
        // いいねボタンを探してクリック
        const likeButton = await page.$('button[data-testid="like-button"], .like-button, button:contains("いいね")');
        if (likeButton) {
          // 既にいいね済みかチェック
          const isLiked = await page.evaluate((button) => {
            return button.classList.contains('liked') || 
                   button.getAttribute('aria-pressed') === 'true' ||
                   button.textContent.includes('いいね済み');
          }, likeButton);

          if (!isLiked) {
            await likeButton.click();
            likeCount++;
            console.log(`いいね成功: ${article.title}`);
            
            // 少し待機
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.log(`既にいいね済み: ${article.title}`);
          }
        }
      } catch (error) {
        console.log(`記事処理エラー: ${article.title}`, error.message);
      }
    }

    await browser.close();

    const result = {
      success: true,
      message: 'Like notes execution completed',
      timestamp: new Date().toISOString(),
      method: req.method,
      searchWord: searchWord,
      searchIndex: index,
      likesCompleted: likeCount,
      maxLikes: maxLikes,
      totalArticles: articles.length,
      environment: 'Vercel Functions'
    };

    console.log('=== Like Notes API 実行完了 ===');
    console.log('結果:', JSON.stringify(result, null, 2));
    res.status(200).json(result);

  } catch (error) {
    console.error('Like Notes API 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method
    });
  }
} 
