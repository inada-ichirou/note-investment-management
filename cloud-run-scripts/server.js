import express from 'express';
import { runFollowAutomation } from './scripts/follow/followFromArticles.js';
import { runDraftCreation } from './scripts/autoCreateAndDraftNote.js';
import { runPublishNotes } from './scripts/autoPublishNotes.js';
import { runLikeNotes } from './scripts/likeUnlikedNotes.js';
import dotenv from 'dotenv';

// 起動時のデバッグ情報
console.log('Starting server...');
console.log('Current working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

try {
  dotenv.config();
  console.log('dotenv configured successfully');
} catch (error) {
  console.error('Error loading dotenv:', error);
}

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

// 基本的なヘルスチェックエンドポイント
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// JSONボディパーサーの設定
app.use(express.json());

// 各エンドポイントの設定
app.post('/follow', async (req, res) => {
  try {
    const result = await runFollowAutomation();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/create-draft', async (req, res) => {
  try {
    const result = await runDraftCreation();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/publish', async (req, res) => {
  try {
    const result = await runPublishNotes();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/like', async (req, res) => {
  try {
    const result = await runLikeNotes();
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// サーバー起動を try-catch で囲む
try {
  console.log('Attempting to start server...');
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
    console.log('Environment variables:');
    console.log('- PORT:', process.env.PORT);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- Current working directory:', process.cwd());
  });

  // エラーイベントのハンドリング
  server.on('error', (error) => {
    console.error('Server error occurred:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    }
  });

  // グレースフルシャットダウン
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  // 未処理のエラーをキャッチ
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    server.close(() => {
      process.exit(1);
    });
  });

} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
