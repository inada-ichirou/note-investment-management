// ログ確認用エンドポイント
export default async function handler(req, res) {
  try {
    console.log('=== Logs API 実行 ===');
    console.log('Method:', req.method);
    console.log('User-Agent:', req.headers['user-agent']);
    console.log('実行時刻:', new Date().toISOString());
    
    const result = {
      success: true,
      message: 'Logs API executed successfully',
      timestamp: new Date().toISOString(),
      method: req.method,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'],
      ip: req.headers['x-forwarded-for'],
      environment: 'Vercel Functions (Logs)',
      note: 'このログはVercelダッシュボードで確認できます'
    };

    console.log('=== Logs API 完了 ===');
    console.log('結果:', JSON.stringify(result, null, 2));
    res.status(200).json(result);

  } catch (error) {
    console.error('Logs API エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method
    });
  }
} 
