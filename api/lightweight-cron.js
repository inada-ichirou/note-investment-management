// 軽量なcronエンドポイント（Puppeteer不使用）
export default async function handler(req, res) {
  // GETとPOSTリクエストを許可
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== Lightweight Cron 実行開始 ===');
    console.log('Method:', req.method);
    
    // 環境変数チェック
    if (!process.env.OPENROUTER_API_KEY || !process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
      throw new Error('必要な環境変数が設定されていません');
    }

    // OpenRouter APIを使用して記事内容を生成
    console.log('OpenRouter APIで記事内容を生成中...');
    
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://note-investment-management.vercel.app',
        'X-Title': 'Note投資管理自動化'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'あなたは投資に関する記事を書く専門家です。毎日、投資に関する有益な情報を提供する記事を作成してください。'
          },
          {
            role: 'user',
            content: `今日の投資に関する記事を作成してください。タイトルと本文を含めてください。現在の日時: ${new Date().toISOString()}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API エラー: ${openRouterResponse.status}`);
    }

    const openRouterData = await openRouterResponse.json();
    const generatedContent = openRouterData.choices[0].message.content;

    console.log('記事内容生成完了！');

    // 生成された内容を解析してタイトルと本文を分離
    const lines = generatedContent.split('\n');
    let title = '';
    let content = '';

    for (const line of lines) {
      if (line.includes('タイトル') || line.includes('Title')) {
        title = line.replace(/.*[:：]\s*/, '').trim();
      } else if (line.trim() && !line.startsWith('#')) {
        content += line + '\n';
      }
    }

    // デフォルトタイトル
    if (!title) {
      title = `投資情報 - ${new Date().toLocaleDateString('ja-JP')}`;
    }

    // デフォルトコンテンツ
    if (!content.trim()) {
      content = generatedContent;
    }

    const result = {
      success: true,
      message: '軽量cron実行完了',
      timestamp: new Date().toISOString(),
      method: req.method,
      title: title,
      content: content.substring(0, 200) + '...', // 最初の200文字のみ表示
      environment: 'Vercel Functions (Lightweight)',
      openRouterUsage: openRouterData.usage
    };

    console.log('=== Lightweight Cron 実行完了 ===');
    res.status(200).json(result);

  } catch (error) {
    console.error('Lightweight Cron 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method
    });
  }
} 
