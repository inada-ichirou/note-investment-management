// 定期実行スケジューラー
// vercel-cron.json で設定された定期実行を受け取り、create-draft.jsを呼び出す

import handler from './create-draft.js';

export default async function scheduler(req, res) {
  console.log('=== スケジューラー実行開始 ===');
  console.log('実行時刻:', new Date().toISOString());
  console.log('Method:', req.method);
  
  try {
    // create-draft.jsのhandlerを直接呼び出し
    const result = await handler(req, res);
    
    console.log('=== スケジューラー実行完了 ===');
    return result;
    
  } catch (error) {
    console.error('スケジューラー実行エラー:', error);
    
    // エラーレスポンスを返す
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
      method: req.method,
      source: 'scheduler'
    });
  }
} 
