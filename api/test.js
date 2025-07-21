// 最もシンプルなテスト用エンドポイント
export default async function handler(req, res) {
  // すべてのHTTPメソッドを許可
  console.log('=== Test Endpoint 実行 ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  
  res.status(200).json({
    success: true,
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    method: req.method,
    userAgent: req.headers['user-agent']
  });
} 
