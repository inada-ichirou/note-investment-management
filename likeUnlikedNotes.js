require('dotenv').config();
const puppeteer = require('puppeteer');
const { login } = require('./noteAutoDraftAndSheetUpdate'); // login関数をexports.loginで取得

(async () => {
  console.log('Puppeteer起動オプションを取得します');
  // CI環境（GitHub Actions等）ではheadless:'new'、ローカルではheadless:false
  const isCI = process.env.CI === 'true';
  console.log('process.env.CIの値:', process.env.CI);
  console.log('isCI:', isCI);
  // 実行環境によってheadlessモードを切り替え
  const isCloud = process.env.RENDER || process.env.CI === 'true'; // RenderやCI環境ならtrue
  // const isCI = process.env.CI === 'true'; // ←CI(GitHub Actions等)専用の分岐に戻したい場合はこちらを有効化
  // ※CI用に戻す場合はisCloudの代わりにisCIを使ってください
  const browser = await puppeteer.launch({
    headless: isCloud ? true : false, // クラウドではtrue、ローカルではfalse
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=1280,900'
    ],
    // Renderなどクラウド環境でchromeのパスを明示的に指定
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  });
  const page = await browser.newPage();

  console.log('noteにログインします');
  await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);
  console.log('ログイン完了');

  // ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー
  // 例：searchWords.length = 11, runsPerDay = 8（3時間ごと: 0,3,6,9,12,15,18,21時）
  //
  // 1月1日（dayOfYear = 1）
  // 時刻   runIndex  index計算式              index  増分
  // 0時    0         (8×1 + 0) % 11 = 8      8     
  // 3時    1         (8×1 + 1) % 11 = 9      9     +1
  // 6時    2         (8×1 + 2) % 11 = 10     10    +1
  // 9時    3         (8×1 + 3) % 11 = 0      0     +1(10→0)
  // 12時   4         (8×1 + 4) % 11 = 1      1     +1
  // 15時   5         (8×1 + 5) % 11 = 2      2     +1
  // 18時   6         (8×1 + 6) % 11 = 3      3     +1
  // 21時   7         (8×1 + 7) % 11 = 4      4     +1
  //
  // 1月2日（dayOfYear = 2）
  // 時刻   runIndex  index計算式              index  増分
  // 0時    0         (8×2 + 0) % 11 = 16 % 11 = 5     
  // 3時    1         (8×2 + 1) % 11 = 17 % 11 = 6     +1
  // 6時    2         (8×2 + 2) % 11 = 18 % 11 = 7     +1
  // 9時    3         (8×2 + 3) % 11 = 19 % 11 = 8     +1
  // 12時   4         (8×2 + 4) % 11 = 20 % 11 = 9     +1
  // 15時   5         (8×2 + 5) % 11 = 21 % 11 = 10    +1
  // 18時   6         (8×2 + 6) % 11 = 22 % 11 = 0     +1(10→0)
  // 21時   7         (8×2 + 7) % 11 = 23 % 11 = 1     +1
  //
  // ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー

  // 検索ワードリスト
  const baseSearchWords = [
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

  // 仕事に悩んでいそうな人を検索するワードリスト
  const workTroubleSearchWords = [
    // 仕事の悩み・ストレス関連
    '仕事 悩み',
    '職場 人間関係',
    '仕事 ストレス',
    '働き方 悩み',
    'キャリア 迷い',
    '転職 迷い',
    '仕事 辞めたい',
    '職場 辛い',
    '仕事 疲れた',
    '働く 意味',
    // スキル・能力の悩み
    'スキル 不足',
    '技術 追いつけない',
    '勉強 時間がない',
    '成長 感じない',
    '能力 不安',
    '自信 ない',
    '経験 浅い',
    '知識 不足',
    // 環境・条件の悩み
    '給料 安い',
    '残業 多い',
    '休み 取れない',
    '評価 されない',
    '昇進 できない',
    '責任 重い',
    'プレッシャー 強い',
    // 将来への不安
    '将来 不安',
    'キャリア 不安',
    '技術 変化',
    'AI 脅威',
    '自動化 怖い',
    '失業 不安',
    '再就職 不安',
    // 具体的な悩み
    'コミュニケーション 苦手',
    '会議 苦手',
    'プレゼン 緊張',
    '報告 遅い',
    '締切 守れない',
    'ミス 多い',
    '効率 悪い',
    '集中 できない',
    'モチベーション 低い',
    '燃え尽き',
    'バーンアウト',
    '過労',
    'うつ',
    'メンタル',
    '心身 疲労'
  ];

  // お金に困っていそうな人を検索するワードリスト
  const moneyTroubleSearchWords = [
    // 生活費・家計の悩み
    'お金 ない',
    '生活費 足りない',
    '家計 苦しい',
    '支払い 困難',
    '借金',
    'ローン 返済',
    'クレジットカード 支払い',
    '家賃 払えない',
    '光熱費 払えない',
    '給料 安い',
    '収入 減った',
    '副業 探し',
    'アルバイト 探し',
    '節約 生活',
    '貯金 できない',
    '貯金 ゼロ',
    '貯金 少ない',
    '急な出費',
    '医療費 困る',
    '教育費 困る',
    '子供 学費',
    '奨学金 返済',
    '生活保護 申請',
    '失業',
    '無職',
    '転職 活動中',
    'パート 探し',
    'シングルマザー お金',
    'シングルファーザー お金',
    '老後資金 不安',
    '年金 少ない',
    '年金 不安',
    '物価 高い',
    'インフレ 困る',
    'ガス代 高い',
    '電気代 高い',
    '食費 高い',
    '家計 見直し',
    '生活 苦しい',
    '生活 困窮',
    '生活 苦労',
    '生活 苦しい',
    '生活 苦しい'
  ];

  // 3つのリストを結合
  const searchWords = [
    ...baseSearchWords,
    ...workTroubleSearchWords,
    ...moneyTroubleSearchWords
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

  console.log('対象ページへ遷移します:', targetUrl);
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });
  console.log('ページ遷移完了');

  // 10回下までスクロール
  for (let i = 0; i < 20; i++) {
    console.log(`下までスクロールします (${i + 1}/20)`);
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5秒待機
  }
  console.log('スクロール完了');

  // 「スキ」ボタン（button要素）をすべて取得
  const likeButtons = await page.$$('button[aria-label="スキ"]');
  console.log('取得した「スキ」ボタン数:', likeButtons.length);

  const maxLikes = 24;
  const likeCount = Math.min(maxLikes, likeButtons.length);
  console.log(`これから${likeCount}件のスキを付けます。`);

  for (let i = 0; i < likeCount; i++) {
    console.log(`--- ${i + 1}件目 ---`);
    const btn = likeButtons[i];
    // ボタンのclass名
    const className = await btn.evaluate(el => el.className);
    console.log('ボタンのclassName:', className);
    // クリック前の状態
    const ariaPressed = await btn.evaluate(el => el.getAttribute('aria-pressed'));
    console.log('クリック前: aria-pressed:', ariaPressed);
    // ボタンの親要素からタイトルと投稿者名を取得
    const info = await btn.evaluate((btn) => {
      let title = 'タイトル不明';
      let user = '投稿者不明';
      // .m-largeNoteWrapper__body からタイトルを探す
      const body = btn.closest('.m-largeNoteWrapper__card');
      if (body) {
        const titleElem = body.querySelector('.m-noteBodyTitle__title');
        if (titleElem) {
          title = titleElem.textContent.trim();
        }
        const infoElem = body.parentElement?.querySelector('.o-largeNoteSummary__userName');
        if (infoElem) {
          user = infoElem.textContent.trim();
        }
      }
      return { title, user };
    });
    console.log(`タイトル: ${info.title}｜投稿者: ${info.user}`);
    // クリック（ElementHandle.click()で本当のユーザー操作をエミュレート）
    console.log('クリック前: ElementHandle.click()実行');
    await btn.click({ delay: 100 });
    // クリック後、aria-pressedがtrueになるまで待機
    await page.waitForFunction(
      el => el.getAttribute('aria-pressed') === 'true',
      { timeout: 5000 },
      btn
    );
    console.log('クリック後: aria-pressedがtrueになったことを確認');
  }
  console.log('クリック処理が全て完了しました');

  await browser.close();
  console.log('ブラウザを閉じました');
})(); 
