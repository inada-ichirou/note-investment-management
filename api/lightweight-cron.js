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
        'X-Title': 'Note Investment Management'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in writing investment articles. Create daily articles with useful investment information. Please respond in English.'
          },
          {
            role: 'user',
            content: `Create today's investment article. Include a title and content. Current date: ${new Date().toISOString()}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      throw new Error(`OpenRouter API エラー: ${openRouterResponse.status} - ${errorText}`);
    }

    const openRouterData = await openRouterResponse.json();
    const generatedContent = openRouterData.choices[0].message.content;

    console.log('記事内容生成完了！');

    // 生成された内容を解析してタイトルと本文を分離
    const lines = generatedContent.split('\n');
    let title = '';
    let content = '';

    for (const line of lines) {
      if (line.toLowerCase().includes('title') || line.includes('タイトル')) {
        title = line.replace(/.*[:：]\s*/i, '').trim();
      } else if (line.trim() && !line.startsWith('#')) {
        content += line + '\n';
      }
    }

    // デフォルトタイトル
    if (!title) {
      title = `Investment Information - ${new Date().toLocaleDateString('en-US')}`;
    }

    // デフォルトコンテンツ
    if (!content.trim()) {
      content = generatedContent;
    }

    const result = {
      success: true,
      message: 'Lightweight cron execution completed',
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
