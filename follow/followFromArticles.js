// はじめてのnoteページの記事一覧から、クリックして遷移
// フォローする、という流れ
// アクティブで、フォロバしてくれそうなユーザーをフォローする上ではこの形が良さそう

// github actions 使用時間累積確認ページ
// https://github.com/settings/billing/usage?period=3&group=1&customer=5978784

import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { login } from '../noteAutoDraftAndSheetUpdate.js';
import fs from 'fs';

dotenv.config();

// タイムアウト設定（10分 = 600秒）
const TIMEOUT_MS = 10 * 60 * 1000; // 10分
let timeoutId;

// Chromeの実行パスを動的に取得する関数
async function getChromePath() {
  const isCI = process.env.CI === 'true';
  if (!isCI) return undefined;
  
  // 複数の可能性のあるパスを試す
  const possiblePaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  
  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      console.log(`Chrome found at: ${path}`);
      return path;
    }
  }
  
  console.log('Chrome not found in standard paths, using default');
  return undefined;
}

function logTime(label) {
  const now = new Date();
  console.log(`[${now.toISOString()}] ${label}`);
}

// タイムアウト処理関数
function handleTimeout() {
  console.log('【タイムアウト発生】10分を超えたため処理を強制終了します');
  process.exit(1);
}

(async () => {
  // タイムアウトタイマーを設定
  timeoutId = setTimeout(handleTimeout, TIMEOUT_MS);
  console.log(`【タイムアウト設定】${TIMEOUT_MS / 1000}秒後に自動終了します`);

  logTime('Puppeteer起動オプションを取得します');
  // 実行引数からheadlessを決定（--bg があればheadless、それ以外は可視）
  const argv = process.argv.slice(2);
  const wantsBackground = argv.includes('--bg');
  const isCI = process.env.CI === 'true';
  const headlessMode = wantsBackground ? 'new' : (isCI ? 'old' : false);
  console.log('process.env.CIの値:', process.env.CI);
  console.log('isCI:', isCI);
  console.log('headlessモード:', headlessMode === false ? '可視(visible)' : 'バックグラウンド(headless)');
  logTime('puppeteer.launch 開始');
  const chromePath = await getChromePath();
  const browser = await puppeteer.launch({
    headless: headlessMode,
    executablePath: chromePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--window-size=1280,900'
    ],
    defaultViewport: null,
    // Puppeteerのタイムアウト設定を追加
    protocolTimeout: 30000, // 30秒
    timeout: 60000 // 60秒
  });
  logTime('puppeteer.launch 完了');
  
  logTime('新規ページ作成開始');
  const page = await browser.newPage();
  
  // ページのタイムアウト設定を追加
  page.setDefaultTimeout(30000); // 30秒
  page.setDefaultNavigationTimeout(30000); // 30秒
  
  logTime('新規ページ作成完了');

  logTime('noteにログイン開始');
  await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);
  logTime('noteログイン完了');

  let isLimit = false; // 上限検知フラグ

  // ダイアログ（alert等）検知時に即座に処理を停止
  page.on('dialog', async dialog => {
    const msg = dialog.message();
    console.log('[ALERT検知]', msg);
    if (msg.includes('上限に達したためご利用できません')) {
      await dialog.dismiss(); // OKボタンを押す
      console.log('【noteフォロー上限に達したため、処理を中断します】');
      isLimit = true; // 上限フラグを立てる
      clearTimeout(timeoutId); // タイムアウトタイマーをクリア
      await browser.close(); // ブラウザを閉じる
      process.exit(0); // 正常終了
    } else {
      await dialog.dismiss();
    }
  });

  // ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー
  // はじめてのnoteのページ
  // const targetUrl = 'https://note.com/interests/%E3%81%AF%E3%81%98%E3%82%81%E3%81%A6%E3%81%AEnote';

  // 注目のページ
  // const targetUrl = 'https://note.com/notemagazine/m/mf2e92ffd6658'

  // 基本検索ワードリスト
  const baseSearchWords = [
    // '駆け出しエンジニア',
    '開発',
    'IT業界',
    'プログラミング',
    '日記',
    'フォロバ',
    'はじめて',
    'エンジニア',
    '初めて',
    '転職',
    'SES',
    'SIer',
    '稼ぐ',
    'フリーランス',
    '在宅',
    'パソコン',
    // 技術関連キーワード
    'Web開発',
    'データベース',
    'AI',
    'システム',
    'インフラ',
    'セキュリティ',
    'UI/UX',
    'デザイン',
    // キャリア関連キーワード
    '副業',
    'スキルアップ',
    '学習',
    '勉強',
    '資格',
    '未経験',
    '新卒',
    '中途',
    'キャリア',
    '成長',
    '挑戦',
    '目標',
    // ライフスタイル関連キーワード
    'テレワーク',
    'リモートワーク',
    'ワークライフバランス',
    '働き方',
    '生産性',
    '効率化',
    'ツール',
    'ガジェット',
    'Mac',
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

  // 両方のリストを結合
  const searchWords = [...baseSearchWords, ...workTroubleSearchWords];

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
  const startTime = Date.now(); // 処理開始時間を記録
  // 検索結果ページ上でポップアップのフォローボタンをクリックする方式に変更
  for (let i = 0; i < uniqueCreators.length && followCount < 15; i++) {
    if (isLimit) break; // 上限検知時は即座にループを抜ける
    
    // タイムアウトチェック
    if (Date.now() - startTime > TIMEOUT_MS) {
      console.log('【タイムアウト検知】処理時間が10分を超えたため処理を中断します');
      break;
    }
    
    const name = uniqueCreators[i].name;
    logTime(`クリエイター${i + 1}のホバー＆ポップアップフォロー処理開始:（${name}）`);
    try {
      // 検索結果ページの各クリエイター要素を再取得
      const userWrappers = await page.$$('.o-largeNoteSummary__userWrapper');
      if (!userWrappers[i]) continue;
      
      // ユーザー名要素を取得してhover
      const userNameElement = await userWrappers[i].$('.o-largeNoteSummary__userName');
      if (!userNameElement) continue;
      
      // より確実なホバー操作
      await userNameElement.hover();
      
      // ホバー後に明示的な待機時間を追加（ポップアップが表示されるまで）
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5秒待機
      
      // ポップアップが出るまで待機（最大3秒に延長）
      let popupVisible = false;
      try {
        await page.waitForSelector('.o-quickLook', { visible: true, timeout: 3000 });
        popupVisible = true;
      } catch (timeoutError) {
        logTime('ポップアップが表示されませんでした。代替方法を試します。');
        popupVisible = false;
      }
      
      if (popupVisible) {
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
          logTime(`フォローボタンをクリックしました`);
          
          // 状態変化を待つ（「フォロー中」になるまで or 最大2秒）
          try {
            await Promise.race([
              page.waitForFunction(
                () => {
                  const btn = document.querySelector('.o-quickLook .a-button');
                  return btn && btn.innerText.trim() === 'フォロー中';
                },
                { timeout: 2000 }
              ),
              new Promise(resolve => setTimeout(resolve, 2000))
            ]);
            
            logTime(`ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー`);
            logTime(`フォロー成功！！（${followCount + 1}件目）｜クリエイター名（${name}）`);
            logTime(`ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー`);
            followCount++;
          } catch (stateChangeError) {
            logTime(`フォロー状態の変更を確認できませんでした: ${stateChangeError.message}`);
            // フォローは成功している可能性があるので、カウントを増やす
            followCount++;
          }
        } else {
          logTime(`すでにフォロー済み、またはボタン状態が「${btnText}」です`);
        }
      } else {
        // ポップアップが表示されない場合の代替方法：直接ユーザーページにアクセス
        try {
          logTime('代替方法：直接ユーザーページでフォローを試行します');
          
          // ユーザーリンクを取得
          const userLink = await userWrappers[i].$('a.o-largeNoteSummary__user');
          if (!userLink) {
            logTime('ユーザーリンクが見つかりませんでした');
            continue;
          }
          
          const userUrl = await userLink.evaluate(el => el.href);
          logTime(`ユーザーページに遷移: ${userUrl}`);
          
          // 新しいタブでユーザーページを開く
          const userPage = await browser.newPage();
          await userPage.goto(userUrl, { waitUntil: 'networkidle2' });
          
          // フォローボタンを探す
          const followButton = await userPage.$('button[data-testid="follow-button"], .a-button, button:contains("フォロー")');
          if (followButton) {
            const buttonText = await followButton.evaluate(el => el.innerText.trim());
            if (buttonText === 'フォロー') {
              await followButton.click();
              logTime(`直接フォロー成功！！（${followCount + 1}件目）｜クリエイター名（${name}）`);
              followCount++;
            } else {
              logTime(`すでにフォロー済み（ボタンテキスト: ${buttonText}）`);
            }
          } else {
            logTime('フォローボタンが見つかりませんでした');
          }
          
          // ユーザーページを閉じる
          await userPage.close();
          
        } catch (alternativeError) {
          logTime(`代替方法でもエラーが発生: ${alternativeError.message}`);
        }
      }
      
      // ポップアップを閉じるために少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 次のクリエイター処理前に少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (e) {
      logTime(`エラー発生: ${e.message}`);
      // エラーが発生しても次のクリエイターに進む
      continue;
    }
  }
  logTime('全フォロー処理完了');
  
  // タイムアウトタイマーをクリア
  clearTimeout(timeoutId);
  
  // 上限検知時はここで安全に終了
  if (isLimit) {
    process.exit(0);
  }
  await browser.close();
  console.log('ブラウザを閉じました');
})(); 
