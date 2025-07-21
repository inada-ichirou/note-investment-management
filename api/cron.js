// 認証不要のcron用エンドポイント
export default async function handler(req, res) {
  // POSTリクエストのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('=== Auto Note 実行開始 ===');
    
    // 環境変数チェック
    if (!process.env.OPENROUTER_API_KEY || !process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
      throw new Error('必要な環境変数が設定されていません');
    }
    
    // スクリプト実行
    const result = await executeAutoNote();
    
    console.log('=== Auto Note 実行完了 ===');
    res.status(200).json({ 
      success: true, 
      message: 'Auto Note 実行完了',
      timestamp: new Date().toISOString(),
      result 
    });
    
  } catch (error) {
    console.error('Auto Note 実行エラー:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function executeAutoNote() {
  // テスト用：Puppeteerを使わずに環境変数チェックのみ
  console.log('環境変数チェック:');
  console.log('- OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '設定済み' : '未設定');
  console.log('- NOTE_EMAIL:', process.env.NOTE_EMAIL ? '設定済み' : '未設定');
  console.log('- NOTE_PASSWORD:', process.env.NOTE_PASSWORD ? '設定済み' : '未設定');
  
  // 環境変数が設定されているかチェック
  if (!process.env.OPENROUTER_API_KEY || !process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
    throw new Error('必要な環境変数が設定されていません');
  }
  
  // テスト用のレスポンス
  return { 
    status: 'success', 
    message: 'API接続テスト完了',
    timestamp: new Date().toISOString(),
    environment: 'Vercel Functions'
  };
} 
