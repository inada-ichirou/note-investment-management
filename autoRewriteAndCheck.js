// 記事のセクションの文字数をチェックし、200文字未満のセクションをAIでリライトする
// 使用方法：node autoRewriteAndCheck.js 37,40,41 等のようにIDだけを指定

require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { execSync } = require('child_process');

const API_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'; // OpenAI互換
// const MODEL = 'google/gemini-pro'; // 必要に応じて変更
// const MODEL = 'google/gemini-2.5-pro-exp-03-25';
// const MODEL = 'deepseek/deepseek-chat-v3-0324:free';
// const MODEL = 'google/gemini-2.0-flash-exp:free';
// ↓早いし、内容も問題なさそう
const MODEL = 'meta-llama/llama-4-maverick:free';

const POSTS_DIR = 'posts';
const CHECK_SCRIPT = 'checkSectionLengths.js';

// 引数パース: 例) 1,5,6 または 2-5
function parseIds(arg) {
  if (!arg) return [];
  if (arg.includes('-')) {
    const [start, end] = arg.split('-').map(Number);
    if (isNaN(start) || isNaN(end) || start > end) return [];
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  } else {
    return arg.split(',').map(Number).filter(n => !isNaN(n));
  }
}

// 指定IDに該当するファイルをpostsディレクトリから探す
function findFileById(id) {
  const files = fs.readdirSync(POSTS_DIR);
  const regex = new RegExp(`^${id}__.*\\.md$`);
  return files.find(f => regex.test(f));
}

// セクションごとに分割
function splitSections(raw) {
  // 先頭の「##」または「###」の前も含めて分割
  // ^##+ で2個以上の#で始まる見出しをすべて対象にする
  console.log('[DEBUG] splitSections: raw start:', JSON.stringify(raw.slice(0, 300)));
  const parts = raw.split(/^##+ /m); // 2個以上の#で分割
  console.log('[DEBUG] splitSections: parts.length:', parts.length);
  parts.forEach((p, i) => console.log(`[DEBUG] splitSections: parts[${i}] start:`, JSON.stringify(p.slice(0, 100))));
  const firstPart = parts[0];
  console.log('[DEBUG] splitSections: firstPart:', JSON.stringify(firstPart));
  const sections = parts.slice(1).map((section, idx) => {
    const lines = section.split('\n');
    const heading = lines[0].trim();
    let body = '';
    for (let i = 1; i < lines.length; i++) {
      // 2個以上の#で始まる行や---で区切る
      if (/^##+ /.test(lines[i]) || lines[i].startsWith('---')) break;
      body += lines[i].trim();
    }
    console.log(`[DEBUG] splitSections: section[${idx}] heading:`, heading);
    console.log(`[DEBUG] splitSections: section[${idx}] body start:`, JSON.stringify(body.slice(0, 100)));
    return { heading, body, raw: section };
  });
  console.log('[DEBUG] splitSections: sections.length:', sections.length);
  sections.forEach((s, i) => console.log(`[DEBUG] splitSections: sections[${i}] heading:`, s.heading));
  return { firstPart, sections };
}

// checkSectionLengths.jsを呼び出してNGセクション名を抽出
function getShortSections(mdPath) {
  let result;
  try {
    // result = execSync(`node ${CHECK_SCRIPT} ${mdPath}`).toString();
    result = execSync(`node ${CHECK_SCRIPT} ${mdPath}`).toString();
    console.log(result); // ← これを追加
  } catch (e) {
    console.error('分量チェックでエラー:', e.message);
    return [];
  }
  // 「「○○」の本文がxxx文字と少なめです」だけ抽出
  const lines = result.split('\n');
  const ngSections = [];
  for (const line of lines) {
    const m = line.match(/^「(.+)」の本文が(\d+)文字と少なめです/);
    if (m) ngSections.push(m[1]);
  }
  return ngSections;
}

// 200文字未満のセクションをリライト
async function rewriteSection(heading, body) {
  // エンジニア・プログラミング学習・初学者向け用プロンプト（可読性向上のため分割）
  const promptLines = [
    'あなたはエンジニア・プログラミングスクールの現役講師です。',
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
    '- 独学や他スクールを勧める内容は避け、必ず自分のマンツーマンレッスンの強みや誘導を盛り込んでください。',
    '- プログラミング初学者・駆け出しエンジニアがつい読みたくなるような、やさしく親しみやすい内容にしてください。',
    '- 現役のプロエンジニア向けの難しい内容や専門的すぎる話題は避けてください。',
    '',
    `元の本文: ${body}`
  ];
  const promptHeader = promptLines.join('\n');

  const messages = [
    { role: 'system', content: 'あなたは日本語のnote記事編集者です。' },
    { role: 'user', content: promptHeader }
  ];
  const res = await axios.post(API_URL, {
    model: MODEL,
    messages,
    max_tokens: 600,
    temperature: 0.7
  }, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data.choices[0].message.content.trim();
}

// 記事末尾にタグを自動付与
async function generateTagsFromContent(content) {
  const promptLines = [
    'あなたは日本語のnote記事編集者です。',
    '以下の記事内容を読み、記事の内容に最も関連するハッシュタグを3～5個、日本語で生成してください。',
    '必ず「#引き寄せ #引き寄せの法則 #裏技」を含め、他にも内容に合うタグがあれば追加してください。',
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
  const res = await axios.post(API_URL, {
    model: MODEL,
    messages,
    max_tokens: 100,
    temperature: 0.5
  }, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data.choices[0].message.content.trim();
}

async function processFile(mdPath) {
  let loop = 0;
  while (true) {
    loop++;
    // 
    const ngSections = getShortSections(mdPath);
    if (ngSections.length === 0) {
      console.log(`すべてのセクションが200文字以上です: ${mdPath}`);
      break;
    }
    console.log(`NGセクション: ${ngSections.join(', ')}（${mdPath}）`);
    let raw = fs.readFileSync(mdPath, 'utf-8');
    console.log('[DEBUG] processFile: raw file start:', JSON.stringify(raw.slice(0, 300)));
    console.log('[DEBUG] processFile: raw file end:', JSON.stringify(raw.slice(-300)));
    let { firstPart, sections } = splitSections(raw);
    console.log('[DEBUG] processFile: firstPart:', JSON.stringify(firstPart));
    console.log('[DEBUG] processFile: sections:', sections.map(s => s.heading));
    sections.forEach((s, i) => {
      console.log(`[DEBUG] processFile: section[${i}] heading:`, s.heading);
      console.log(`[DEBUG] processFile: section[${i}] body start:`, JSON.stringify(s.body.slice(0, 100)));
    });
    let updated = false;
    for (let i = 0; i < sections.length; i++) {
      const { heading, body, raw: sectionRaw } = sections[i];
      if (ngSections.includes(heading)) {
        console.log(`「${heading}」の本文が${body.length}文字と少なめです。AIでリライトします...`);
        const newBody = await rewriteSection(heading, body);
        // 末尾に余分な改行を追加
        const newBodyWithExtraLine = newBody + '\n';
        const lines = sectionRaw.split('\n');
        lines.splice(1, lines.length - 1, newBodyWithExtraLine);
        sections[i].raw = lines.join('\n');
        updated = true;
        console.log(`[DEBUG] processFile: section[${i}] after rewrite, raw:`, JSON.stringify(sections[i].raw.slice(0, 100)));
      }
    }
    if (updated) {
      // firstPartの末尾に必ず改行を追加
      const safeFirstPart = firstPart.endsWith('\n') ? firstPart : firstPart + '\n';
      const newRaw = safeFirstPart + sections.map(s => '## ' + s.raw).join('\n');
      console.log('[DEBUG] processFile: newRaw start:', JSON.stringify(newRaw.slice(0, 300)));
      console.log('[DEBUG] processFile: newRaw end:', JSON.stringify(newRaw.slice(-300)));
      fs.writeFileSync(mdPath, newRaw, 'utf-8');
      console.log(`リライト・追記が完了しました: ${mdPath}（${loop}回目）`);
    } else {
      break;
    }
  }
  // ここでタグ自動付与
  let finalRaw = fs.readFileSync(mdPath, 'utf-8');
  console.log('[DEBUG] processFile: finalRaw before tag:', JSON.stringify(finalRaw.slice(0, 300)));
  // 既存タグ行があれば除去
  finalRaw = finalRaw.replace(/\n# .+$/gm, '');
  console.log('[DEBUG] processFile: finalRaw after tag removal:', JSON.stringify(finalRaw.slice(0, 300)));
  const tags = await generateTagsFromContent(finalRaw);
  console.log('[DEBUG] processFile: generated tags:', tags);
  finalRaw = finalRaw.trim() + '\n\n\n\n' + tags + '\n';
  console.log('[DEBUG] processFile: finalRaw before write:', JSON.stringify(finalRaw.slice(0, 300)));
  fs.writeFileSync(mdPath, finalRaw, 'utf-8');
  console.log(`記事末尾にタグを自動付与しました: ${tags}`);
}

// メイン処理
(async () => {
  const arg = process.argv[2];
  if (!arg) {
    console.error('記事ID（例: 1,5,6 または 2-5）を指定してください');
    process.exit(1);
  }
  const ids = parseIds(arg);
  if (ids.length === 0) {
    console.error('有効な記事IDが指定されていません');
    process.exit(1);
  }
  for (const id of ids) {
    const file = findFileById(id);
    if (!file) {
      console.warn(`ID ${id} に該当する記事ファイルが見つかりません`);
      continue;
    }
    const mdPath = path.join(POSTS_DIR, file);
    console.log(`\n=== 記事ID: ${id} (${file}) の処理を開始 ===`);
    await processFile(mdPath);
  }
})(); 
