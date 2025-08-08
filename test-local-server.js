// ローカルテスト用のExpressサーバー
// autoCreateAndDraftNote.jsの機能をAPIエンドポイントとして提供

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// autoCreateAndDraftNote.jsからメイン関数をインポート
import autoCreateAndDraftNote from './autoCreateAndDraftNote.js';

// 環境変数読み込み
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(cors());
app.use(express.json());

// ログミドルウェア
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'note-automation-local',
    version: '1.0.0'
  });
});

// メインエンドポイント: 記事作成・下書き保存
app.post('/api/v1/create_draft', async (req, res) => {
  console.log('=== 記事自動作成・下書き保存開始 ===');
  
  // レスポンスタイムアウトを5分に設定
  req.setTimeout(5 * 60 * 1000);
  res.setTimeout(5 * 60 * 1000);
  
  try {
    // 環境変数チェック
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY環境変数が設定されていません');
    }
    
    if (!process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
      throw new Error('NOTE_EMAIL or NOTE_PASSWORD環境変数が設定されていません');
    }

    // 即座に処理開始レスポンスを送信
    res.json({
      status: 'processing',
      message: '記事作成処理を開始しました。完了まで3-5分程度かかります。',
      timestamp: new Date().toISOString()
    });

    // バックグラウンドで記事作成処理を実行
    console.log('バックグラウンドで記事作成処理を開始...');
    autoCreateAndDraftNote()
      .then(() => {
        console.log('=== 記事自動作成・下書き保存完了 ===');
      })
      .catch((error) => {
        console.error('バックグラウンド記事作成エラー:', error.message);
      });
    
  } catch (error) {
    console.error('記事作成エラー:', error.message);
    console.error(error.stack);
    
    // エラーレスポンス
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// GETでもアクセス可能（テスト用）
app.get('/api/v1/create_draft', async (req, res) => {
  console.log('=== 記事自動作成・下書き保存開始（GET） ===');
  
  try {
    // 環境変数チェック
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY環境変数が設定されていません');
    }
    
    if (!process.env.NOTE_EMAIL || !process.env.NOTE_PASSWORD) {
      throw new Error('NOTE_EMAIL or NOTE_PASSWORD環境変数が設定されていません');
    }

    // autoCreateAndDraftNote.jsのメイン関数を実行
    await autoCreateAndDraftNote();
    
    console.log('=== 記事自動作成・下書き保存完了（GET） ===');
    
    // 成功レスポンス
    res.json({
      status: 'success',
      message: 'Note記事の下書き作成が完了しました',
      method: 'GET',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('記事作成エラー（GET）:', error.message);
    
    // エラーレスポンス
    res.status(500).json({
      status: 'error',
      message: error.message,
      method: 'GET',
      timestamp: new Date().toISOString()
    });
  }
});

// エラーハンドリングミドルウェア
app.use((error, req, res, next) => {
  console.error('サーバーエラー:', error);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404ハンドリング
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    available_endpoints: [
      'GET /health',
      'POST /api/v1/create_draft',
      'GET /api/v1/create_draft'
    ],
    timestamp: new Date().toISOString()
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log('🚀 ローカルテストサーバーが起動しました');
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log('');
  console.log('利用可能なエンドポイント:');
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  POST http://localhost:${PORT}/api/v1/create_draft`);
  console.log(`  GET  http://localhost:${PORT}/api/v1/create_draft (テスト用)`);
  console.log('');
  console.log('使用方法:');
  console.log(`  curl -X POST http://localhost:${PORT}/api/v1/create_draft`);
  console.log('  またはブラウザで GET アクセス');
  console.log('');
  console.log('停止: Ctrl+C');
});

export default app;
