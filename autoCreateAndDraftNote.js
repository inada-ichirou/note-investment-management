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
import axios from 'axios';
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

// APIキーの形式検証
if (!API_KEY.startsWith('sk-or-v1-')) {
  console.error('警告: APIキーが正しい形式ではありません。sk-or-v1-で始まる必要があります。');
}

// MODEL定数を先に定義
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

// 簡単なAPI接続テスト
console.log('=== API接続テスト ===');

// 環境変数でAPI接続テストをスキップ可能
if (process.env.SKIP_API_TEST === 'true') {
  console.log('SKIP_API_TEST=true のため、API接続テストをスキップします');
} else {
  try {
    console.log('API接続テスト開始...');
    console.log('使用モデル:', MODEL);
    console.log('API URL:', API_URL);
    
    const testResponse = await axios.post(API_URL, {
      model: MODEL,
      messages: [{ role: 'user', content: 'こんにちは' }],
      max_tokens: 10
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒に延長
    });
    console.log('API接続テスト: 成功 ✅');
    console.log('レスポンス時間:', testResponse.headers['x-request-id'] ? '正常' : '不明');
  } catch (e) {
    console.error('API接続テスト: 失敗 ❌');
    console.error('エラー詳細:', e.message);
    
    if (e.code === 'ECONNABORTED') {
      console.error('タイムアウトエラー: 30秒以内にレスポンスがありませんでした');
      console.error('考えられる原因:');
      console.error('1. ネットワーク接続が遅い');
      console.error('2. OpenRouterサーバーの応答が遅い');
      console.error('3. モデルが一時的に利用できない');
    }
    
    if (e.response) {
      console.error('ステータス:', e.response.status);
      console.error('レスポンス:', e.response.data);
    } else if (e.request) {
      console.error('リクエストは送信されたがレスポンスが受信されませんでした');
    }
    
    console.error('API接続テストをスキップして処理を継続します...');
    // テスト失敗でも処理を継続（exitしない）
  }
}

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
      const res = await axios.post(API_URL, {
        model: MODEL,
        messages,
        max_tokens: 1200,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const data = res?.data;

      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid response format (generateArticle) - Full response:', JSON.stringify(data, null, 2));
        console.error('Response structure check:');
        console.error('- data exists:', !!data);
        console.error('- data.choices exists:', !!data?.choices);
        console.error('- data.choices is array:', Array.isArray(data?.choices));
        console.error('- data.choices[0] exists:', !!data?.choices?.[0]);
        console.error('- data.choices[0].message exists:', !!data?.choices?.[0]?.message);
        throw new Error('Invalid response format from OpenRouter API');
      }

      return data.choices[0].message.content.trim();
    } catch (e) {
      lastError = e;
      console.error(`AI記事生成APIエラー（${tryCount}回目）:`, e.message);
      if (e.response) {
        console.error('APIレスポンスstatus:', e.response.status);
        try { console.error('APIレスポンスdata:', JSON.stringify(e.response.data)); } catch (_) { console.error('APIレスポンスdata: [stringify失敗]'); }
        try { console.error('APIレスポンスheaders:', JSON.stringify(e.response.headers)); } catch (_) { console.error('APIレスポンスheaders: [stringify失敗]'); }
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
  console.log('=== splitSections開始 ===');
  console.log('元の記事の長さ:', raw.length);
  console.log('元の記事の先頭100文字:', raw.substring(0, 100));
  
  const parts = raw.split(/^##+ /m); // 2個以上の#で分割
  console.log('分割後のパーツ数:', parts.length);
  
  const firstPart = parts[0];
  console.log('firstPartの長さ:', firstPart.length);
  console.log('firstPartの内容:', firstPart);
  
  const sections = parts.slice(1).map((section, index) => {
    const lines = section.split('\n');
    const heading = lines[0].trim();
    let body = '';
    for (let i = 1; i < lines.length; i++) {
      if (/^##+ /.test(lines[i]) || lines[i].startsWith('---')) break;
      body += lines[i].trim();
    }
    console.log(`セクション${index + 1}: "${heading}" (本文${body.length}文字)`);
    return { heading, body, raw: section };
  });
  
  console.log('=== splitSections完了 ===');
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
    { role: 'system', content: 'あなたは日本語の投資記事編集者です。' },
    { role: 'user', content: promptHeader }
  ];
  
  let tryCount = 0;
  let lastError = null;
  while (tryCount < 3) {
    tryCount++;
    try {
      const res = await axios.post(API_URL, {
        model: MODEL,
        messages,
        max_tokens: 600,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒のタイムアウト
      });

      const data = res?.data;

      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid response format (rewriteSection) - Full response:', JSON.stringify(data, null, 2));
        throw new Error('Invalid response format from OpenRouter API');
      }
      return data.choices[0].message.content.trim();
    } catch (e) {
      lastError = e;
      console.error(`rewriteSection: API呼び出しでエラー（${tryCount}回目）:`, e.message);
      
      // より詳細なエラー情報を出力
      if (e.response) {
        console.error('rewriteSection e.response.status:', e.response.status);
        console.error('rewriteSection e.response.statusText:', e.response.statusText);
        console.error('rewriteSection e.response.headers:', JSON.stringify(e.response.headers, null, 2));
        try { 
          console.error('rewriteSection e.response.data:', JSON.stringify(e.response.data, null, 2)); 
        } catch (_) { 
          console.error('rewriteSection e.response.data: [stringify失敗]'); 
        }
      } else if (e.request) {
        console.error('rewriteSection: リクエストは送信されたがレスポンスが受信されませんでした');
        console.error('rewriteSection e.request:', e.request);
      } else {
        console.error('rewriteSection: リクエスト設定時にエラーが発生しました');
        console.error('rewriteSection e.config:', e.config);
      }
      
      if (tryCount < 3) {
        const backoffMs = 1000 * tryCount;
        console.log(`${backoffMs}ms 待機してリトライします...`);
        await new Promise(r => setTimeout(r, backoffMs));
      }
    }
  }
  throw new Error('rewriteSection: 3回連続で失敗しました: ' + (lastError && lastError.message));
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
  let tryCount = 0;
  let lastError = null;
  while (tryCount < 3) {
    tryCount++;
    try {
      const res = await axios.post(API_URL, {
        model: MODEL,
        messages,
        max_tokens: 100,
        temperature: 0.5
      }, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒のタイムアウト
      });

      const data = res?.data;

      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid response format (generateTags) - Full response:', JSON.stringify(data, null, 2));
        throw new Error('Invalid response format from OpenRouter API');
      }

      return data.choices[0].message.content.trim();
    } catch (e) {
      lastError = e;
      console.error(`generateTagsFromContent: API呼び出しでエラー（${tryCount}回目）:`, e.message);
      const status = e?.response?.status;
      if (status) console.error('generateTagsFromContent e.response.status:', status);
      if (e.response) {
        try { console.error('generateTagsFromContent e.response.data:', JSON.stringify(e.response.data)); } catch (_) { console.error('generateTagsFromContent e.response.data: [stringify失敗]'); }
      }
      if (tryCount < 3) {
        const backoffMs = 1000 * tryCount;
        console.log(`${backoffMs}ms 待機してリトライします...`);
        await new Promise(r => setTimeout(r, backoffMs));
      }
    }
  }
  throw new Error('generateTagsFromContent: 3回連続で失敗しました: ' + (lastError && lastError.message));
}

// アフィリエイトリンクを生成する関数
function generateAffiliateLink() {
  return [
    '',
    '💰　💎　💰　💎　💰　💎　💰　💎　💰　💎　💰　💎　💰　💎　💰',
    'https://amzn.to/41MwWSl',
    '👆お金のことを広く学ぶのに最適です！コスパ最高です😊',
    '💰　💎　💰　💎　💰　💎　💰　💎　💰　💎　💰　💎　💰　💎　💰',
    '',
  ].join('\n');
}

// 記事の最初、中間、最後にアフィリエイトリンクを挿入する関数
function insertAffiliateLinks(content) {
  const affiliateLink = generateAffiliateLink();
  
  // 記事を段落に分割
  const paragraphs = content.split('\n\n');
  
  if (paragraphs.length < 3) {
    // 段落が少ない場合は、最初と最後に挿入
    return paragraphs[0] + '\n\n' + affiliateLink + '\n\n' + paragraphs.slice(1).join('\n\n') + '\n\n' + affiliateLink;
  }
  
  // 最初の段落の後にアフィリエイトリンクを挿入
  const firstPart = paragraphs[0] + '\n\n' + affiliateLink;
  
  // 中間の段落を特定（全体の1/3から2/3の位置）
  const middleIndex = Math.floor(paragraphs.length * 0.4);
  const middlePart = paragraphs.slice(1, middleIndex).join('\n\n') + '\n\n' + affiliateLink + '\n\n' + paragraphs.slice(middleIndex, -1).join('\n\n');
  
  // 最後の段落の後にアフィリエイトリンクを挿入
  const lastPart = paragraphs[paragraphs.length - 1] + '\n\n' + affiliateLink;
  
  return [firstPart, middlePart, lastPart].join('\n\n');
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
      
      try {
        const newBody = await rewriteSection(heading, body, API_URL, API_KEY, MODEL);
        const newBodyWithExtraLine = newBody + '\n';
        const lines = sectionRaw.split('\n');
        lines.splice(1, lines.length - 1, newBodyWithExtraLine);
        sections[i].raw = lines.join('\n');
        updated = true;
        console.log(`「${heading}」のリライトが完了しました`);
      } catch (e) {
        console.error(`「${heading}」のリライトに失敗しました:`, e.message);
        console.log(`「${heading}」は元の内容のまま処理を継続します`);
        // リライト失敗時は元の内容を保持
      }
      
      // APIリクエストの間に適切な待機時間を設定（レート制限回避）
      if (i < sections.length - 1) {
        console.log('次のセクション処理前に2秒待機します...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  // 記事の最初、中間、最後にアフィリエイトリンクを挿入
  console.log('アフィリエイトリンクを3箇所に挿入します...');
  
  // firstPartの末尾に必ず改行を追加
  const safeFirstPart = firstPart.endsWith('\n') ? firstPart : firstPart + '\n';
  
  // セクションを結合して記事全体を作成
  let articleContent = safeFirstPart + '\n\n' + sections.map(s => '## ' + s.raw).join('\n');
  
  // アフィリエイトリンクを3箇所に挿入
  articleContent = insertAffiliateLinks(articleContent);
  
  console.log('アフィリエイトリンク挿入完了');
  console.log('articleContentの長さ:', articleContent.length);
  
  // マガジンへの誘導セクション（リライト処理の成功・失敗に関係なく必ず挿入）
  console.log('マガジン誘導セクションを挿入します...');
  
  const magazinePromotion = [
    '🐈　🐾　🐈‍⬛　🐾　🐈　🐾　🐈‍⬛　🐾　🐈　🐾　🐈‍⬛　🐾　🐈　🐾　🐈‍⬛　',
    '',
    '✅「そろそろ資産運用、何か始めたい！」というあなたへ',
    '',
    '投資に興味はあるけど、「何から始めればいい？」「失敗が怖い…」そんな不安を、無料で解消できるマガジンを用意しました。',
    '',
    '【早めに不安を払拭する資産運用】',
    '✔ まずは小さく始めたい',
    '✔ 仕組みをシンプルに知りたい',
    'そんな人にピッタリです。',
    '',
    '安心して一歩踏み出すヒントを、無料でどうぞ。',
    '',
    'https://note.com/investment_happy/m/m76229c09696b',
    '',
    '🐈　🐾　🐈‍⬛　🐾　🐈　🐾　🐈‍⬛　🐾　🐈　🐾　🐈‍⬛　🐾　🐈　🐾　🐈‍⬛　',
    ''
  ].join('\n');
  
  // 既存タグ行があれば除去
  articleContent = articleContent.replace(/\n# .+$/gm, '');
  
  // タグ生成（失敗時のフォールバック付き）
  let tags = '';
  try {
    console.log('タグ生成を開始します...');
    tags = await generateTagsFromContent(articleContent, API_URL, API_KEY, MODEL);
    console.log('タグ生成が完了しました:', tags);
  } catch (e) {
    console.error('タグ生成に失敗しました。フォールバックの固定タグを使用します。理由:', e.message);
    tags = '#資産運用 #投資 #運用 #株 #投資信託 #FIRE #PR';
  }

  // タグの直前に案内文を追加（日本語コメント付き）
  const infoText = [
    '最後までお読みいただきありがとうございます！💬',
    '継続して、お得な情報を発信していきますので、フォローお願いします！',
  ].join('\n');
  
  // Amazonアソシエイトの適格販売に関する文言を追加
  const amazonAssociateText = 'Amazon のアソシエイトとして、「まずは100円から💹投資|運用|資産形成」は適格販売により収入を得ています。';
  
  const finalContent = articleContent.trim() + '\n\n' + magazinePromotion + '\n\n' + infoText + '\n\n' + amazonAssociateText + '\n\n' + tags + '\n';
  console.log('記事の加工が完了しました。アフィリエイトリンク、マガジン誘導、タグが含まれています。');
  return finalContent;
}

/**
 * ランダムな絵文字を選択する関数
 * @returns {string} ランダムに選択された絵文字
 */
function getRandomEmoji() {
  const emojis = ['❤️', '🌸', '🛑', '㊙︎', '🟥', '🈲', '🉐', '㊗️', '㊙️', '⭕', '‼️', '🎉', '🌸'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

/**
 * 記事本文からタイトルを抽出し、h1タイトル行を除去した本文を返す
 * @param {string} article - 記事本文
 * @returns {{ title: string, filteredArticle: string }}
 */
export function extractTitleAndFilterH1(article) {
  let originalTitle = '無題';
  const titleMatch = article.match(/^#\s*(.+)$/m);
  if (titleMatch && titleMatch[1].trim().length > 0) {
    originalTitle = titleMatch[1].trim();
  } else {
    // 先頭行がタイトルでない場合、最初の10文字を仮タイトルに
    originalTitle = article.split('\n').find(line => line.trim().length > 0)?.slice(0, 10) || '無題';
  }

  // タイトルの先頭にランダムな絵文字を追加
  const emoji = getRandomEmoji();
  const title = `${emoji} ${originalTitle}`;

  // 記事からタイトル関連の行を除去（複数のパターンに対応）
  const articleLines = article.split('\n');
  console.log('元のタイトル:', originalTitle);
  console.log('絵文字付きタイトル:', title);
  
  // 除去すべき行のパターン
  const patternsToRemove = [
    `# ${originalTitle}`,           // 元のタイトル（H1形式）
    `# ${title}`,                   // 絵文字付きタイトル（H1形式）
    originalTitle,                  // 元のタイトル（プレーンテキスト）
    title,                          // 絵文字付きタイトル（プレーンテキスト）
    `## ${originalTitle}`,          // 元のタイトル（H2形式）
    `## ${title}`,                  // 絵文字付きタイトル（H2形式）
    `### ${originalTitle}`,         // 元のタイトル（H3形式）
    `### ${title}`                  // 絵文字付きタイトル（H3形式）
  ];

  const filteredArticleLines = articleLines.filter(line => {
    const trimmedLine = line.trim();
    return !patternsToRemove.includes(trimmedLine);
  });
  
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
  let rewrittenArticle;
  try {
    rewrittenArticle = await rewriteAndTagArticle(filteredArticle, API_URL, API_KEY, MODEL);
    console.log('記事リライト・チェックが完了しました');
  } catch (e) {
    console.error('記事リライト・チェックでエラーが発生しました:', e.message);
    console.log('元の記事にマガジン誘導セクションとタグを手動で追加します');
    
    console.log('=== 手動マガジン誘導セクション追加開始 ===');
    console.log('filteredArticleの長さ:', filteredArticle.length);
    console.log('filteredArticleの先頭200文字:', filteredArticle.substring(0, 200));
    console.log('filteredArticleの末尾200文字:', filteredArticle.substring(filteredArticle.length - 200));
    
    // アフィリエイトリンクを3箇所に挿入
    console.log('手動でアフィリエイトリンクを3箇所に挿入します...');
    rewrittenArticle = insertAffiliateLinks(filteredArticle);
    
    // マガジンへの誘導セクションを手動で追加
    const magazinePromotion = [
      '🐈　🐾　🐈‍⬛　🐾　🐈　🐾　🐈‍⬛　🐾　🐈　🐾　🐈‍⬛　🐾　🐈　🐾　🐈‍⬛　',
      '',
      '✅「そろそろ資産運用、何か始めたい！」というあなたへ',
      '',
      '投資に興味はあるけど、「何から始めればいい？」「失敗が怖い…」そんな不安を、無料で解消できるマガジンを用意しました。',
      '',
      '【早めに不安を払拭する資産運用】',
      '✔ まずは小さく始めたい',
      '✔ 仕組みをシンプルに知りたい',
      'そんな人にピッタリです。',
      '',
      '安心して一歩踏み出すヒントを、無料でどうぞ。',
      '',
      'https://note.com/investment_happy/m/m76229c09696b',
      '',
      '🐈　🐾　🐈‍⬛　🐾　🐈　🐾　🐈‍⬛　🐾　🐈　🐾　🐈‍⬛　🐾　🐈　🐾　🐈‍⬛　',
      ''
    ].join('\n');
    
    const infoText = [
      '最後までお読みいただきありがとうございます！💬',
      '継続して、お得な情報を発信していきますので、フォローお願いします！',
    ].join('\n');
    
    const tags = '#資産運用 #投資 #運用 #株 #投資信託 #FIRE #PR';
    
    // Amazonアソシエイトの適格販売に関する文言を追加
    const amazonAssociateText = 'Amazon のアソシエイトとして、「まずは100円から💹投資|運用|資産形成」は適格販売により収入を得ています。';
    
    // 元の記事にアフィリエイトリンク、マガジン誘導、タグを追加
    rewrittenArticle = rewrittenArticle.trim() + '\n\n' + magazinePromotion + '\n\n' + infoText + '\n\n' + amazonAssociateText + '\n\n' + tags + '\n';
    console.log('手動でマガジン誘導セクションとタグを追加しました');
    console.log('rewrittenArticleの長さ:', rewrittenArticle.length);
    console.log('rewrittenArticleの先頭200文字:', rewrittenArticle.substring(0, 200));
    console.log('rewrittenArticleの末尾200文字:', rewrittenArticle.substring(rewrittenArticle.length - 200));
    console.log('=== 手動マガジン誘導セクション追加完了 ===');
  }

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
    
    // 実行引数からheadlessを決定（--bg があればheadless、それ以外は可視）
    const argv = process.argv.slice(2);
    const wantsBackground = argv.includes('--bg');
    const headlessMode = wantsBackground ? 'new' : false;
    
    console.log('process.env.CIの値:', process.env.CI);
    console.log('isCI:', isCI);
    console.log('isFly:', isFly);
    console.log('isVercel:', isVercel);
    console.log('isPipedream:', isPipedream);
    console.log('headlessモード:', headlessMode === false ? '可視(visible)' : 'バックグラウンド(headless)');
    
    let launchOptions = {
      headless: wantsBackground ? 'new' : (isFly || isCI || isVercel || isPipedream ? true : false),
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
      ],
      defaultViewport: null
    };

    // 環境別の設定
    if (isVercel) {
      // Vercel環境専用設定
      console.log('Vercel環境専用のPuppeteer設定を使用');
      
      // Vercel環境では明示的にChromeパスを指定
      launchOptions = {
        headless: wantsBackground ? 'new' : true,
        executablePath: '/vercel/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
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
      
      console.log('Vercel環境のChromeパス:', launchOptions.executablePath);
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
