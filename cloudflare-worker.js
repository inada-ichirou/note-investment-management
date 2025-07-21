// Cloudflare Workers用のcron機能付きスクリプト
// 毎日9:00に実行される

export default {
  // cron trigger: 毎日9:00に実行
  async scheduled(event, env, ctx) {
    console.log('=== Cloudflare Workers Cron 実行開始 ===');
    console.log('実行時刻:', new Date().toISOString());
    
    try {
      // VercelのAPIを呼び出し
      const response = await fetch('https://note-investment-management-d65pker21-aa0921s-projects.vercel.app/api/public-cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cloudflare-Workers-Cron/1.0',
          'X-Cloudflare-Worker': 'true'
        },
        body: JSON.stringify({
          source: 'cloudflare-workers',
          timestamp: new Date().toISOString()
        })
      });
      
      const result = await response.text();
      console.log('Vercel API レスポンス:', response.status, result);
      
      // 成功ログ
      if (response.ok) {
        console.log('✅ Cloudflare Workers Cron 実行成功');
      } else {
        console.log('❌ Cloudflare Workers Cron 実行失敗:', response.status);
      }
      
      return new Response(JSON.stringify({
        success: response.ok,
        status: response.status,
        result: result,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Cloudflare Workers Cron エラー:', error);
      return new Response(JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
  
  // HTTPリクエスト用（手動テスト用）
  async fetch(request, env, ctx) {
    console.log('=== 手動実行開始 ===');
    return this.scheduled(null, env, ctx);
  }
}; 
