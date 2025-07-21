// Cloudflare Workers用のcron機能付きスクリプト
// 毎日9:00に実行される

export default {
  // cron trigger: 毎日9:00に実行
  async scheduled(event, env, ctx) {
    console.log('=== Cloudflare Workers Cron 実行開始 ===');
    
    try {
      // VercelのAPIを呼び出し
      const response = await fetch('https://note-investment-management-d65pker21-aa0921s-projects.vercel.app/api/public-cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cloudflare-Workers-Cron/1.0'
        }
      });
      
      const result = await response.text();
      console.log('Vercel API レスポンス:', response.status, result);
      
      return new Response(JSON.stringify({
        success: response.ok,
        status: response.status,
        result: result
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Cloudflare Workers Cron エラー:', error);
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
  
  // HTTPリクエスト用（手動テスト用）
  async fetch(request, env, ctx) {
    return this.scheduled(null, env, ctx);
  }
}; 
