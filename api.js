console.log('=== api.js: サーバー起動処理開始 ===');
// 環境変数を読み込み
require('dotenv').config();
// 必要なモジュールを読み込み
const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

// JSONボディパーサーを有効化
app.use(express.json());

// 各スクリプトのmain関数をエクスポートしておく必要があります
// 例: module.exports.main = async function() { ... } という形
const autoCreateAndDraftNote = require('./autoCreateAndDraftNote.js');
const followFromArticles = require('./follow/followFromArticles.js');
const likeUnlikedNotes = require('./likeUnlikedNotes.js');
const autoPublishNotes = require('./autoPublishNotes.js');

// ルート（/）へのアクセスに簡単なレスポンスを返す
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'APIサーバーは稼働中です',
    endpoints: [
      '/create-draft - 下書き作成',
      '/follow - フォロー実行',
      '/like - いいね実行',
      '/publish - 記事公開'
    ]
  });
});

// /favicon.ico へのアクセスには204 No Contentを返す
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 下書き作成API
app.get('/create-draft', async (req, res) => {
  console.log('=== api.js: /create-draft リクエスト受信 ===');
  try {
    if (typeof autoCreateAndDraftNote.main === 'function') {
      await autoCreateAndDraftNote.main();
      res.json({ status: 'success', message: 'autoCreateAndDraftNote.js 実行完了' });
    } else {
      res.status(500).json({ status: 'error', message: 'autoCreateAndDraftNote.js に main 関数がありません' });
    }
  } catch (e) {
    console.error('=== api.js: /create-draft エラー ===', e);
    res.status(500).json({ status: 'error', message: 'エラー: ' + e.message });
  }
});

// フォローAPI
app.get('/follow', async (req, res) => {
  console.log('=== api.js: /follow リクエスト受信 ===');
  try {
    if (typeof followFromArticles.main === 'function') {
      await followFromArticles.main();
      res.json({ status: 'success', message: 'followFromArticles.js 実行完了' });
    } else {
      res.status(500).json({ status: 'error', message: 'followFromArticles.js に main 関数がありません' });
    }
  } catch (e) {
    console.error('=== api.js: /follow エラー ===', e);
    res.status(500).json({ status: 'error', message: 'エラー: ' + e.message });
  }
});

// いいねAPI
app.get('/like', async (req, res) => {
  console.log('=== api.js: /like リクエスト受信 ===');
  try {
    if (typeof likeUnlikedNotes.main === 'function') {
      await likeUnlikedNotes.main();
      res.json({ status: 'success', message: 'likeUnlikedNotes.js 実行完了' });
    } else {
      res.status(500).json({ status: 'error', message: 'likeUnlikedNotes.js に main 関数がありません' });
    }
  } catch (e) {
    console.error('=== api.js: /like エラー ===', e);
    res.status(500).json({ status: 'error', message: 'エラー: ' + e.message });
  }
});

// 公開API
app.get('/publish', async (req, res) => {
  console.log('=== api.js: /publish リクエスト受信 ===');
  try {
    if (typeof autoPublishNotes.main === 'function') {
      await autoPublishNotes.main();
      res.json({ status: 'success', message: 'autoPublishNotes.js 実行完了' });
    } else {
      res.status(500).json({ status: 'error', message: 'autoPublishNotes.js に main 関数がありません' });
    }
  } catch (e) {
    console.error('=== api.js: /publish エラー ===', e);
    res.status(500).json({ status: 'error', message: 'エラー: ' + e.message });
  }
});

// ヘルスチェックAPI
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404エラーハンドリング
app.use((req, res) => {
  res.status(404).json({ 
    status: 'error', 
    message: 'エンドポイントが見つかりません',
    availableEndpoints: ['/', '/health', '/create-draft', '/follow', '/like', '/publish']
  });
});

// サーバー起動
app.listen(port, '0.0.0.0', () => {
  console.log(`=== api.js: サーバー起動 http://0.0.0.0:${port} ===`);
}); 
