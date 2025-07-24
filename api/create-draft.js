// 記事を自動作成して下書きに追加するAPIエンドポイント
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import fetch from 'node-fetch';
import { login, goToNewPost, dragAndDropToAddButton, fillArticle, saveDraft, closeDialogs } from '../noteAutoDraftAndSheetUpdate.js';

export default async function handler(req, res) {
  // GETとPOSTリクエストを許可
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== Create Draft API 実行開始 ===');
  console.log('Method:', req.method);
  console.log('実行時刻:', new Date().toISOString());

  try {
    // 環境変数チェック
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }
    if (!process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
      throw new Error('NOTE_EMAIL or NOTE_PASSWORD is not set');
    }

    const API_KEY = process.env.OPENROUTER_API_KEY;
    const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    // const MODEL = 'openai/gpt-3.5-turbo';
    const MODEL = 'deepseek/deepseek-chat-v3-0324:free';

    // 題材リスト
    const topics = [
      '資産運用の基礎',
      '投資初心者向けガイド',
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
    const patterns = [
      '一歩踏み込んだ理解',
      '具体的な活用方法',
      '楽にする方法',
      '投資することのメリット',
      '複利効果の威力',
      'ランキング-トップ5',
      'ランキング-トップ5',
      'ランキング-トップ5',
      'ランキング-トップ5',
      'まつわるQ&Aまとめ',
      'やってはいけないNG行動',
      '初心者が最初の1ヶ月でやることリスト',
      'プロに聞いた極意',
      '続けるためのモチベーション維持法',
    ];

    // ランダムに題材と切り口を選択
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];

    console.log(`選択された題材: ${randomTopic}`);
    console.log(`選択された切り口: ${randomPattern}`);

    // 記事生成
    async function generateArticle(topic, pattern) {
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

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://note.com',
          'X-Title': 'Investment Management Bot'
        },
        body: JSON.stringify({
          model: MODEL,
          messages: messages,
          max_tokens: 4000,
          temperature: 0.7
        })
      });

      const data = await response.json();
      
      // エラーハンドリング
      if (!response.ok) {
        console.error('OpenRouter API Error:', data);
        throw new Error(`OpenRouter API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
      }
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from OpenRouter API');
      }
      
      return data.choices[0].message.content;
    }

    // 記事を生成
    console.log('記事を生成中...');
    const rawArticle = await generateArticle(randomTopic, randomPattern);
    console.log('記事生成完了');

    // 記事をセクションに分割
    function splitSections(raw) {
      const lines = raw.split('\n');
      const sections = [];
      let currentSection = { heading: '', body: '' };
      
      for (const line of lines) {
        if (line.match(/^#{1,6}\s+/)) {
          if (currentSection.heading) {
            sections.push(currentSection);
          }
          currentSection = { heading: line.replace(/^#{1,6}\s+/, ''), body: '' };
        } else {
          currentSection.body += line + '\n';
        }
      }
      
      if (currentSection.heading) {
        sections.push(currentSection);
      }
      
      return sections;
    }

    // セクションをリライト
    async function rewriteSection(heading, body, API_URL, API_KEY, MODEL) {
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
      const response = await fetch(API_URL, {
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
      const data = await response.json();
      // エラーハンドリング
      if (!response.ok) {
        console.error('OpenRouter API Error:', data);
        throw new Error(`OpenRouter API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
      }
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from OpenRouter API');
      }
      return data.choices[0].message.content.trim();
    }

    // タグを生成
    async function generateTagsFromContent(content, API_URL, API_KEY, MODEL) {
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
      return data.choices[0].message.content.trim();
    }

    // 記事をリライトしてタグを生成
    console.log('記事をリライト中...');
    const sections = splitSections(rawArticle);
    let improvedContent = '';
    
    for (const section of sections) {
      if (section.heading) {
        improvedContent += `# ${section.heading}\n\n`;
        if (section.body.trim()) {
          const improvedBody = await rewriteSection(section.heading, section.body, API_URL, API_KEY, MODEL);
          improvedContent += improvedBody + '\n\n';
        }
      }
    }

    console.log('タグを生成中...');
    const tags = await generateTagsFromContent(improvedContent, API_URL, API_KEY, MODEL);
    console.log('タグ生成完了');

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
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--window-size=1280,900'
      ],
      timeout: 60000
    });

    const page = await browser.newPage();
    
    // User-Agent設定
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    // note.comにログイン
    console.log('note.comにログイン中...');
    await login(page, process.env.NOTE_EMAIL, process.env.NOTE_PASSWORD);

    // 新規投稿画面へ遷移
    await goToNewPost(page);
    
    // サムネイル画像アップロード
    await dragAndDropToAddButton(page);
    
    // 記事タイトル・本文を入力
    const title = `${randomTopic} - ${randomPattern}`;
    await fillArticle(page, title, improvedContent);
    
    // 下書き保存
    await saveDraft(page);
    
    // ダイアログを閉じる
    await closeDialogs(page);

    await browser.close();

    const result = {
      success: true,
      message: 'Create draft execution completed',
      timestamp: new Date().toISOString(),
      method: req.method,
      title: title,
      topic: randomTopic,
      pattern: randomPattern,
      contentLength: improvedContent.length,
      tags: tags,
      environment: 'Vercel Functions'
    };

    console.log('=== Create Draft API 実行完了 ===');
    console.log('結果:', JSON.stringify(result, null, 2));
    res.status(200).json(result);

  } catch (error) {
    console.error('Create Draft API 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method
    });
  }
} 
