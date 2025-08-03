// Pipedream用のNote記事自動投稿ワークフロー
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';

// 環境変数の設定（Pipedreamの環境変数から取得）
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const NOTE_EMAIL = process.env.NOTE_EMAIL;
const NOTE_PASSWORD = process.env.NOTE_PASSWORD;

// 記事生成用の設定
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-3.5-sonnet';

// 題材と切り口のリスト
const topics = [
  '投資信託', '株式投資', '債券投資', '不動産投資', 'FX取引', 
  '仮想通貨', '保険商品', '年金制度', '税金対策', '資産運用'
];

const patterns = [
  '初心者向け解説', 'リスク管理のポイント', '最新トレンド分析', 
  '実践的な投資戦略', 'よくある失敗パターン', '成功事例の紹介'
];

// 記事生成関数
async function generateArticle(topic, pattern) {
  const prompt = `
以下の条件で投資関連の記事を生成してください：

題材: ${topic}
切り口: ${pattern}

要件:
- 2000-3000文字程度
- 実用的で具体的な内容
- 初心者にも分かりやすい説明
- 見出し（h2, h3）を適切に使用
- 箇条書きやリストを効果的に活用
- 結論でまとめを提供

記事のタイトルも含めて生成してください。
`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://note-investment-management.vercel.app',
      'X-Title': 'Note Investment Management'
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

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// タイトル抽出とH1除去関数
function extractTitleAndFilterH1(article) {
  const lines = article.split('\n');
  let title = '';
  let filteredArticle = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 最初のH1タイトルを抽出
    if (!title && line.startsWith('# ')) {
      title = line.replace('# ', '');
      continue;
    }
    
    // H1以外の行を記事本文に追加
    if (!line.startsWith('# ')) {
      filteredArticle += line + '\n';
    }
  }

  // タイトルが見つからない場合は最初の行を使用
  if (!title && lines.length > 0) {
    title = lines[0].trim();
  }

  return { title, filteredArticle: filteredArticle.trim() };
}

// メイン処理関数
export default defineComponent({
  name: "Note Article Creation",
  version: "0.0.1",
  props: {
    // プロパティの定義（必要に応じて）
  },
  async run({ steps, $ }) {
    try {
      console.log('=== Note記事自動投稿開始 ===');
      
      // 環境変数チェック
      if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not set');
      }
      if (!NOTE_EMAIL || !NOTE_PASSWORD) {
        throw new Error('NOTE_EMAIL or NOTE_PASSWORD is not set');
      }

      // ランダムに題材と切り口を選択
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];

      console.log(`選択された題材: ${randomTopic}`);
      console.log(`選択された切り口: ${randomPattern}`);

      // 記事生成
      console.log('記事を生成中...');
      const article = await generateArticle(randomTopic, randomPattern);
      console.log('記事生成完了');

      if (!article || article.length < 30) {
        throw new Error('AI記事生成に失敗、または内容が不十分です。');
      }

      // タイトル抽出とH1除去
      const { title, filteredArticle } = extractTitleAndFilterH1(article);

      // Puppeteerでブラウザ操作
      console.log('Puppeteer起動開始...');
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-extensions'
        ]
      });

      const page = await browser.newPage();
      console.log('ブラウザページ作成完了');

      // User-Agent設定
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

      // note.comにログイン
      console.log('note.comにログイン中...');
      await page.goto('https://note.com/login');
      await page.waitForSelector('input[name="email"]');
      await page.type('input[name="email"]', NOTE_EMAIL);
      await page.type('input[name="password"]', NOTE_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      // 新規投稿画面へ遷移
      console.log('新規投稿画面へ遷移中...');
      await page.goto('https://note.com/notes/new');
      await page.waitForSelector('.note-editor');

      // 記事タイトル・本文を入力
      console.log('記事タイトル・本文入力中...');
      await page.waitForSelector('input[placeholder="タイトルを入力"]');
      await page.type('input[placeholder="タイトルを入力"]', title);
      
      // 本文エディタに記事を入力
      await page.waitForSelector('.note-editor .ProseMirror');
      await page.click('.note-editor .ProseMirror');
      await page.keyboard.type(filteredArticle);

      // 下書き保存
      console.log('下書き保存中...');
      await page.waitForSelector('button[data-testid="save-draft-button"]');
      await page.click('button[data-testid="save-draft-button"]');
      await page.waitForTimeout(3000);

      await browser.close();
      console.log('ブラウザ操作完了');

      // 結果を返す
      return {
        success: true,
        message: 'Note記事の下書き作成が完了しました',
        timestamp: new Date().toISOString(),
        title: title,
        topic: randomTopic,
        pattern: randomPattern,
        contentLength: filteredArticle.length
      };

    } catch (error) {
      console.error('エラーが発生しました:', error);
      throw error;
    }
  },
}); 
