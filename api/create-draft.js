// 記事を自動作成して下書きに追加するAPIエンドポイント
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const fetch = require('node-fetch');

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
      const prompt = `
以下の条件で投資・資産運用に関する記事を作成してください。

題材: ${topic}
切り口: ${pattern}

要件:
- 2000-3000文字程度
- 実用的で具体的な内容
- 初心者にも分かりやすい説明
- 見出しを適切に使用
- 箇条書きやリストを効果的に使用
- 読者の行動を促す内容

形式:
- タイトル
- 導入文（200-300文字）
- 本文（見出し付き）
- まとめ（200-300文字）

投資・資産運用の専門知識を活かして、価値のある記事を作成してください。
`;

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
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.7
        })
      });

      const data = await response.json();
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
      const prompt = `
以下のセクションを、より読みやすく、実用的な内容に改善してください。

見出し: ${heading}
内容: ${body}

改善のポイント:
- 文章を読みやすくする
- 具体的な例や数字を追加
- 実践的なアドバイスを含める
- 読者の理解を深める内容にする

元の内容を大幅に変更せず、改善のみを行ってください。
`;

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
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.5
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    }

    // タグを生成
    async function generateTagsFromContent(content, API_URL, API_KEY, MODEL) {
      const prompt = `
以下の記事内容から、note.comで使用するタグを5-8個生成してください。

記事内容:
${content.substring(0, 1000)}...

タグの条件:
- 投資・資産運用に関連する
- 検索されやすいキーワード
- ハッシュタグ形式（#タグ名）
- 日本語と英語の組み合わせも可

タグのみを返してください（改行区切り）。
`;

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
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.3
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
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
    await page.goto('https://note.com/login', { waitUntil: 'networkidle2' });
    
    await page.type('input[name="email"]', process.env.NOTE_EMAIL);
    await page.type('input[name="password"]', process.env.NOTE_PASSWORD);
    await page.click('button[type="submit"]');
    
    // ログイン完了を待機
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('ログイン完了');

    // 新規記事作成ページに移動
    await page.goto('https://note.com/notes/new', { waitUntil: 'networkidle2' });
    
    // タイトルを入力
    const title = `${randomTopic} - ${randomPattern}`;
    await page.type('input[placeholder*="タイトル"], input[name="title"]', title);
    
    // 本文を入力
    await page.type('textarea[placeholder*="本文"], textarea[name="body"]', improvedContent);
    
    // タグを入力
    const tagInput = await page.$('input[placeholder*="タグ"], input[name="tags"]');
    if (tagInput) {
      await tagInput.type(tags);
    }
    
    // 下書きとして保存
    const saveButton = await page.$('button:contains("下書き保存"), button[data-testid="save-draft"]');
    if (saveButton) {
      await saveButton.click();
      console.log('下書き保存完了');
    }

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
