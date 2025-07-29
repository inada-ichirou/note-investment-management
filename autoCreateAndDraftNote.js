// autoCreateAndDraftNote.js
// 記事を自動で作成し、note.comの下書きに追加するスクリプト
// Puppeteerを利用
// 日本語コメントで説明

// dotenvの読み込みを最初に行う
import dotenv from 'dotenv';
dotenv.config();

import puppeteer from 'puppeteer';
// import fs from 'fs';
// import path from 'path';
import fetch from 'node-fetch';
// const { execSync } = require('child_process');

const API_KEY = process.env.OPENROUTER_API_KEY;
export const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// デバッグ用：環境変数の確認
console.log('=== 環境変数確認 ===');
console.log('process.env.OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '設定済み' : '未設定');
console.log('API_KEY:', API_KEY ? '設定済み' : '未設定');

// APIキーの確認
if (!API_KEY) {
  console.error('エラー: OPENROUTER_API_KEY環境変数が設定されていません');
  console.error('設定方法:');
  console.error('1. .envファイルに OPENROUTER_API_KEY=your-api-key を追加');
  console.error('2. または環境変数として設定');
  console.error('3. .envファイルの内容を確認してください');
  process.exit(1);
}

// APIキーの詳細確認
console.log('=== APIキー詳細確認 ===');
console.log('APIキーの長さ:', API_KEY.length);
console.log('APIキーの先頭:', API_KEY.substring(0, 10));
console.log('APIキーの末尾:', API_KEY.substring(API_KEY.length - 10));
console.log('APIキーに空白が含まれているか:', API_KEY.includes(' '));
console.log('APIキーに改行が含まれているか:', API_KEY.includes('\n'));
console.log('APIキーにタブが含まれているか:', API_KEY.includes('\t'));

// const MODEL = 'google/gemini-pro'; // 必要に応じて変更
// const MODEL = 'google/gemini-2.5-pro-exp-03-25';

// const MODEL = 'google/gemini-2.0-flash-exp:free';

// 2025/06/25 なぜか認証エラーで使えなくなった
// const MODEL = 'meta-llama/llama-4-maverick:free';

// ↓成功するが、文章作成性能が悪いかも
// const MODEL = 'deepseek/deepseek-r1-0528-qwen3-8b:free';

// https://openrouter.ai/models?max_price=0&order=top-weekly
// を見ても、↓一番使われている
// ↓少し遅いがまあまあ文章作成能力も高そう
export const MODEL = 'deepseek/deepseek-chat-v3-0324:free';


// const POSTS_DIR = 'posts';
// const SHEET_PATH = '投稿一覧管理表.md';

// 題材リスト
export const topics = [
  '資産運用の基礎',
  '投資初心者向けガイド',
  // 投資信託について多めに
  '投資信託',
  '投資信託のメリット',
  '株式投資の始め方',
  'FIRE（経済的自立・早期退職）',
  'FIRE達成のための戦略',
  '資産形成の基本',
  '投資初心者の悩み',
  '長期投資のメリット',
  '投資家のマインドセット',
  '資産運用の最初のステップ',
  '効率的な投資ポートフォリオ',
  '投資で失敗しないための心構え',
  '初心者からの資産形成',
  '成功投資家の1日・投資スタイル',
  '自身の投資における成功談・失敗談',
];

// 切り口リスト
export const patterns = [
  '一歩踏み込んだ理解',
  '具体的な活用方法',
  '楽にする方法',
  '投資することのメリット',
  '複利効果の威力',
  // ランキングを多めに
  'ランキング-トップ5',
  'ランキング-トップ5',
  'ランキング-トップ5',
  'ランキング-トップ5',
  'まつわるQ&Aまとめ',
  'やってはいけないNG行動',
  '初心者が最初の1ヶ月でやることリスト',
  'プロに聞いた極意',
  '続けるためのモチベーション維持法',
  'ありがちな勘違いと正しいやり方',
  '成功例・失敗例から学ぶ',
  '「何から始めるべきか」という初心者の疑問に答える',
  '具体的な投資フェーズと目標設定',
  'モチベーション維持のコツや、投資を継続するためのマインドセット',
  'つみたてNISAとiDeCoの基本的な使い方を実践的に解説',
  '各投資商品の「なぜ選ぶのか」という目的を明確にする',
  '初心者でもすぐに使える実践的な投資手法',
  '自身の具体的な投資経験談を交え、読者に共感と学びを提供する',
  '資産形成の具体的なステップや目標達成方法',
  '投資の面白さや大変さを伝える',
  'ポートフォリオ管理の重要性と具体的な方法',
  '投資コミュニティでの円滑なコミュニケーション術',
  'リスク管理を成長の機会に変えるマインドセット'
];

// AIで記事生成
export async function generateArticle(topic, pattern) {
  // 記事生成プロンプト（可読性向上のため分割）
  const promptLines = [
    'あなたは日本語のnote記事編集者です。以下の題材と切り口でnote記事を1本作成してください。',
    '',
    `題材: ${topic}`,
    `切り口: ${pattern}`,
    '',
    '【条件】',
    '- タイトル、本文、ハッシュタグ（#から始まるもの）を含めてください。',
    '- タイトルは1行目に「# タイトル」として記載してください。',
    '- 本文は見出しや箇条書きも交えて1000文字程度で丁寧にまとめてください。',
    '- ハッシュタグは記事末尾に「#〇〇 #〇〇 ...」の形式でまとめてください。',
    '- すべて日本語で出力してください。',
    '- 切り口に沿った内容になるようにしてください。',
    '- あなたはプロの投資家で、プロの編集者です。', // 試しに追加
    '- 読みやすさを重視してください', // 試しに追加
    '- もし題材・切り口を鑑みて可能であればランキング形式にしてください', // 試しに追加
    '- 改行を多めに入れて、読みやすくしてください。', // 試しに追加
    '- 文章作成時に多めに、たくさん絵文字を使用してください。各行に1つくらいは入れてください。', // 試しに追加
    '- この記事を読んだ人が投資したい、とモチベーションが上がるような内容にしてください。',
    '- 投資初心者がつい読みたくなるような、やさしく親しみやすい内容にしてください。',
    '- 現役の投資家向けの難しい内容や専門的すぎる話題は避けてください。',
    '- noteの正しいマークダウン記法のみを使ってください。',
    '- 箇条書きはマークダウンではなく、「・ 」で表現してください。',
    '- 見出しはh2（## 見出し）・h3（### 見出し）のみ。',
    '- 番号付きリストは使わないようにしてください。',
    // '- 箇条書きは「- 」、太字は「**」で囲む、引用は「> 」、コードは「```」で囲む形式のみ使用してください。',
    '- h1（# タイトル）はタイトル行のみで本文中では使わないでください。',
    '- その他のマークダウンやHTMLタグは使わないでください。',
  ];
  const prompt = promptLines.join('\n');
  const messages = [
    { role: 'system', content: 'あなたは日本語のnote記事編集者です。' },
    { role: 'user', content: prompt }
  ];
  // AI記事生成APIリクエストを最大3回までリトライ
  let tryCount = 0;
  let lastError = null;
  while (tryCount < 3) {
    tryCount++;
    try {
      // APIリクエスト内容を詳細にログ出力
      // console.log('AI記事生成APIリクエスト先:', API_URL);
      // console.log('AI記事生成APIリクエストヘッダー:', {
      //   'Authorization': `Bearer ${API_KEY}`,
      //   'Content-Type': 'application/json'
      // });
      // console.log('AI記事生成APIリクエストモデル:', MODEL);
      // APIキーの一部だけ（セキュリティのため）
      if (API_KEY) {
        console.log('API_KEYの先頭6文字:', API_KEY.slice(0, 6), '...（省略）');
      } else {
        console.log('API_KEYが未設定です');
      }
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: 1200,
          temperature: 0.7
        })
      });
      
      const data = await res.json();
      
      // エラーハンドリング
      if (!res.ok) {
        console.error('OpenRouter API Error (generateArticle):', JSON.stringify(data, null, 2));
        console.error('Response status:', res.status);
        console.error('Response headers:', Object.fromEntries(res.headers.entries()));
        throw new Error(`OpenRouter API error: ${res.status} - ${data.error?.message || 'Unknown error'}`);
      }
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid response format (generateArticle) - Full response:', JSON.stringify(data, null, 2));
        console.error('Response structure check:');
        console.error('- data.choices exists:', !!data.choices);
        console.error('- data.choices is array:', Array.isArray(data.choices));
        console.error('- data.choices[0] exists:', !!data.choices?.[0]);
        console.error('- data.choices[0].message exists:', !!data.choices?.[0]?.message);
        throw new Error(`Invalid response format from OpenRouter API - Status: ${res.status}, Response: ${JSON.stringify(data)}`);
      }
      
      // console.log("AI記事生成APIリクエスト-res", res)
      // console.log("AI記事生成APIリクエスト-res.data.choices[0].message.content", data.choices[0].message.content)
      // console.log("AI記事生成APIリクエスト-res.data.choices", data.choices)

      // これがレスポンスの中身
      return data.choices[0].message.content.trim();
    } catch (e) {
      lastError = e;
      console.error(`AI記事生成APIエラー（${tryCount}回目）:`, e.message);
      if (e.response) {
        console.error('APIレスポンスstatus:', e.response.status);
        console.error('APIレスポンスdata:', JSON.stringify(e.response.data));
        console.error('APIレスポンスheaders:', JSON.stringify(e.response.headers));
      } else if (e.request) {
        console.error('APIリクエスト自体が失敗:', e.request);
      } else {
        console.error('APIリクエスト前のエラー:', e);
      }
      if (tryCount < 3) {
        console.log('2秒待機してリトライします...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  // 3回失敗した場合はエラー終了
  throw new Error('AI記事生成APIリクエストが3回連続で失敗しました: ' + (lastError && lastError.message));
}

// ファイル名生成
// function makeFileName(id, title) {
//   const date = new Date().toISOString().slice(0, 10);
//   // タイトルからファイル名用文字列を生成
//   const safeTitle = title.replace(/[\s#\/:*?"<>|\\]/g, '').slice(0, 30);
//   return `${id}__${date}-${safeTitle}.md`;
// }

// note.com下書き保存用の関数をインポート
import { login, goToNewPost, dragAndDropToAddButton, fillArticle, saveDraft, closeDialogs } from './noteAutoDraftAndSheetUpdate.js';

export function splitSections(raw) {
  const parts = raw.split(/^##+ /m); // 2個以上の#で分割
  const firstPart = parts[0];
  const sections = parts.slice(1).map((section) => {
    const lines = section.split('\n');
    const heading = lines[0].trim();
    let body = '';
    for (let i = 1; i < lines.length; i++) {
      if (/^##+ /.test(lines[i]) || lines[i].startsWith('---')) break;
      body += lines[i].trim();
    }
    return { heading, body, raw: section };
  });
  return { firstPart, sections };
}

// 200字未満のセクションをリライト
export async function rewriteSection(heading, body, API_URL, API_KEY, MODEL) {
  const promptHeader = [
    'あなたはプロの投資家で、プロの編集者です。',
    `以下のnote記事の「${heading}」という見出しの本文が${body.length}文字しかありません。`,
    '200文字以上になるように、実体験や具体例、学習アドバイス、キャリアのヒントを交えて厚くリライト・追記してください。',
    '',
    '【注意】',
    '- タイトルや見出しは出力せず、本文のみを返してください。',
    '- 「追加した要素」や「文字数」などのメタ情報は一切出力しないでください。',
    '- 不要な記号や記号列（「】」「*」「#」など）も使用しないでください。',
    '- 文章は話し言葉やカジュアルな表現を避け、できるだけ丁寧な敬語でまとめてください。',
    '- です・ます・で統一してください。',
    '- 文章のみを返してください。',
    '- 文章は日本語で返してください。',
    '- 英語や他言語が混じらないようにしてください。',
    '- あなたはプロの投資家で、プロの編集者です。', // 試しに追加
    '- 読みやすさを重視してください', // 試しに追加
    '- 改行をなるべく多めに入れて、読みやすくしてください。', // 試しに追加
    '- 文章作成時に多めに、たくさん絵文字を使用してください。各行に1つくらいは入れてください。', // 試しに追加
    '- 元々の文章に沿った内容になるようにしてください。',
    '- noteの正しいマークダウン記法のみを使ってください。',
    '- 箇条書きはマークダウンではなく、「・ 」で表現してください。',
    '- 番号付きリストは使わないようにしてください。',
    `- 文章のみを返してください。`,
    `- 文章は日本語で返してください。acency等の英語が混じらないようにしてください。`,

    '',
    `元の本文: ${body}`
  ].join('\n');
  const messages = [
    { role: 'system', content: 'あなたは日本語のnote記事編集者です。' },
    { role: 'user', content: promptHeader }
  ];
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 600,
      temperature: 0.7
    })
  });
  const data = await res.json();
  
  // エラーハンドリング
  if (!res.ok) {
    console.error('OpenRouter API Error:', JSON.stringify(data, null, 2));
    console.error('Response status:', res.status);
    console.error('Response headers:', Object.fromEntries(res.headers.entries()));
    throw new Error(`OpenRouter API error: ${res.status} - ${data.error?.message || 'Unknown error'}`);
  }
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Invalid response format - Full response:', JSON.stringify(data, null, 2));
    console.error('Response structure check:');
    console.error('- data.choices exists:', !!data.choices);
    console.error('- data.choices is array:', Array.isArray(data.choices));
    console.error('- data.choices[0] exists:', !!data.choices?.[0]);
    console.error('- data.choices[0].message exists:', !!data.choices?.[0]?.message);
    throw new Error(`Invalid response format from OpenRouter API - Status: ${res.status}, Response: ${JSON.stringify(data)}`);
  }
  
  return data.choices[0].message.content.trim();
}

// 記事末尾にタグを自動付与
export async function generateTagsFromContent(content, API_URL, API_KEY, MODEL) {
  const promptLines = [
    'あなたは日本語のnote記事編集者です。',
    '以下の記事内容を読み、記事の内容に最も関連するハッシュタグを3～5個、日本語で生成してください。',
    '必ず「#資産運用 #投資 #運用 #株 #投資信託 #FIRE」を含め、他にも内容に合うタグがあれば追加してください。',
    'タグは半角スペース区切りで、本文や説明は一切不要です。',
    '',
    '記事内容:',
    content
  ];
  const prompt = promptLines.join('\n');
  const messages = [
    { role: 'system', content: 'あなたは日本語のnote記事編集者です。' },
    { role: 'user', content: prompt }
  ];
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 100,
      temperature: 0.5
    })
  });
  const data = await res.json();
  
  // エラーハンドリング
  if (!res.ok) {
    console.error('OpenRouter API Error (generateTags):', JSON.stringify(data, null, 2));
    console.error('Response status:', res.status);
    throw new Error(`OpenRouter API error: ${res.status} - ${data.error?.message || 'Unknown error'}`);
  }
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Invalid response format (generateTags) - Full response:', JSON.stringify(data, null, 2));
    throw new Error(`Invalid response format from OpenRouter API - Status: ${res.status}, Response: ${JSON.stringify(data)}`);
  }
  
  return data.choices[0].message.content.trim();
}

// 200字未満のセクションをリライトし、タグを付与して返す
export async function rewriteAndTagArticle(raw, API_URL, API_KEY, MODEL) {
  let { firstPart, sections } = splitSections(raw);
  let updated = false;
  // 200字未満のセクションをリライト
  for (let i = 0; i < sections.length; i++) {
    const { heading, body, raw: sectionRaw } = sections[i];
    if (body.length < 200) {
      console.log(`「${heading}」の本文が${body.length}文字と少なめです。AIでリライトします...`);
      const newBody = await rewriteSection(heading, body, API_URL, API_KEY, MODEL);
      const newBodyWithExtraLine = newBody + '\n';
      const lines = sectionRaw.split('\n');
      lines.splice(1, lines.length - 1, newBodyWithExtraLine);
      sections[i].raw = lines.join('\n');
      updated = true;
    }
  }
  // firstPartの末尾に必ず改行を追加
  const safeFirstPart = firstPart.endsWith('\n') ? firstPart : firstPart + '\n';
  let newRaw = safeFirstPart + sections.map(s => '## ' + s.raw).join('\n');
  // 既存タグ行があれば除去
  newRaw = newRaw.replace(/\n# .+$/gm, '');
  // タグ生成
  const tags = await generateTagsFromContent(newRaw, API_URL, API_KEY, MODEL);

  // タグの直前に案内文を追加（日本語コメント付き）
  const infoText = [
    '最後までお読みいただきありがとうございます！💬',
    '継続して、お得な情報を発信していきますので、フォローお願いします！',
  ].join('\n');
  newRaw = newRaw.trim() + '\n\n' + infoText + '\n\n' + tags + '\n';
  return newRaw;
}

/**
 * 記事本文からタイトルを抽出し、h1タイトル行を除去した本文を返す
 * @param {string} article - 記事本文
 * @returns {{ title: string, filteredArticle: string }}
 */
export function extractTitleAndFilterH1(article) {
  let title = '無題';
  const titleMatch = article.match(/^#\s*(.+)$/m);
  if (titleMatch && titleMatch[1].trim().length > 0) {
    title = titleMatch[1].trim();
  } else {
    // 先頭行がタイトルでない場合、最初の10文字を仮タイトルに
    title = article.split('\n').find(line => line.trim().length > 0)?.slice(0, 10) || '無題';
  }

  const h1TitleLine = `# ${title}`;
  const articleLines = article.split('\n');
  console.log('タイトル:', title);
  console.log('h1TitleLine:', JSON.stringify(h1TitleLine));
  const filteredArticleLines = articleLines.filter(line => line.trim() !== h1TitleLine);
  const filteredArticle = filteredArticleLines.join('\n');

  return { title, filteredArticle };
}

// APIサーバー用のmain関数をエクスポート
export default async function main() {
  // 1. 題材ランダム選択
  const topic = topics[Math.floor(Math.random() * topics.length)];
  // 2. 切り口ランダム選択
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  console.log('選ばれた題材:', topic);
  console.log('選ばれた切り口:', pattern);

  // 3. AIで記事生成
  const article = await generateArticle(topic, pattern);
  console.log('AI生成記事全文:\n', article);
  if (!article || article.length < 30) {
    console.error('AI記事生成に失敗、または内容が不十分です。処理を中断します。');
    return;
  }

  // 4. タイトル抽出とh1タイトル行除去
  const { title, filteredArticle } = extractTitleAndFilterH1(article);

  // 5. 記事リライト・チェック（直接関数で処理）
  let rewrittenArticle = await rewriteAndTagArticle(filteredArticle, API_URL, API_KEY, MODEL);
  console.log('記事リライト・チェックが完了しました');

  // 6. note.comに下書き保存（Puppeteerで自動化）
  try {
    console.log('note.comに下書き保存処理を開始します...');
    
    // Fly.io環境でのPuppeteer起動オプション（Alex MacArthurの記事を参考）
    // 注意: Puppeteerは必須機能のため無効化しない
    console.log('=== Fly.io環境でのPuppeteer起動 ===');
    
    // 環境に応じたPuppeteer起動設定
    const isVercel = process.env.VERCEL === '1';
    const isPipedream = process.env.PIPEDREAM === '1' || process.env.PIPEDREAM_RUNTIME_ID;
    const isFly = !!process.env.FLY_APP_NAME;
    const isCI = process.env.CI === 'true';
    
    console.log('process.env.CIの値:', process.env.CI);
    console.log('isCI:', isCI);
    console.log('isFly:', isFly);
    console.log('isVercel:', isVercel);
    console.log('isPipedream:', isPipedream);
    
    let launchOptions = {
      headless: isFly || isCI || isVercel || isPipedream ? true : false,
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
    };

    // 環境別の設定
    if (isVercel) {
      // Vercel環境 - 動的にChromeパスを検出
      const possiblePaths = [
        '/vercel/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/opt/google/chrome/chrome',
        '/opt/google/chrome-stable/chrome',
        '/usr/bin/google-chrome-stable',
        '/snap/bin/chromium',
        '/usr/bin/chrome',
        '/usr/bin/chrome-browser'
      ];
      
      console.log('Vercel環境でChromeパスを検索中...');
      for (const path of possiblePaths) {
        console.log(`パス確認: ${path} - 存在: ${fs.existsSync(path)}`);
        if (fs.existsSync(path)) {
          launchOptions.executablePath = path;
          console.log(`Vercel環境でChromeパスを発見: ${path}`);
          break;
        }
      }
      
      if (!launchOptions.executablePath) {
        console.log('Vercel環境でChromeパスが見つからないため、channelを使用');
        launchOptions.channel = 'chrome';
        // channel使用時はexecutablePathを削除
        delete launchOptions.executablePath;
      }
    } else if (isPipedream) {
      // Pipedream環境
      launchOptions.channel = 'chrome';
    } else {
      // ローカル環境
      launchOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
    
    console.log('Puppeteer起動開始...');
    const browser = await Promise.race([
      puppeteer.launch(launchOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Puppeteer起動タイムアウト（30秒）')), 30000)
      )
    ]);
    console.log('Puppeteer起動完了');
    const page = await browser.newPage();
    // noteにログイン
    await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);
    // 新規投稿画面へ遷移
    await goToNewPost(page);
    // サムネイル画像アップロード
    await dragAndDropToAddButton(page);
    // 記事タイトル・本文を入力
    await fillArticle(page, title, rewrittenArticle); // リライト・タグ付与済み本文
    // 下書き保存
    await saveDraft(page);
    // ダイアログを閉じる
    await closeDialogs(page);
    await browser.close();
    console.log('note.comへの下書き保存が完了しました');
    // 成功時に記事タイトルを表示
    console.log('下書き保存した記事タイトル:', title);
  } catch (e) {
    console.error('note.com下書き保存処理中にエラー:', e);
    throw e;
  }
}

// 直接実行の場合
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(() => console.log('完了')).catch(console.error);
}
