// ヘルスチェック用エンドポイント
export default async function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Note投資管理自動化ツール API 稼働中'
  });
} 
