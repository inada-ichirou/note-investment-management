console.log('=== api.js: サーバー起動処理開始 ===');
// 必要なモジュールを読み込み
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// 各スクリプトのmain関数をエクスポートしておく必要があります
// 例: module.exports.main = async function() { ... } という形
const autoCreateAndDraftNote = require('./autoCreateAndDraftNote.js');
const followFromArticles = require('./follow/followFromArticles.js');
const likeUnlikedNotes = require('./likeUnlikedNotes.js');
const autoPublishNotes = require('./autoPublishNotes.js');

// ルート（/）へのアクセスに簡単なレスポンスを返す
app.get('/', (req, res) => {
  res.send('APIサーバーは稼働中です');
});

// /favicon.ico へのアクセスには204 No Contentを返す
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 下書き作成API
app.get('/create-draft', async (req, res) => {
  console.log('=== api.js: /create-draft リクエスト受信 ===');
  try {
    if (typeof autoCreateAndDraftNote.main === 'function') {
      await autoCreateAndDraftNote.main();
      res.send('autoCreateAndDraftNote.js 実行完了');
    } else {
      res.status(500).send('autoCreateAndDraftNote.js に main 関数がありません');
    }
  } catch (e) {
    res.status(500).send('エラー: ' + e.message);
  }
});

// フォローAPI
app.get('/follow', async (req, res) => {
  console.log('=== api.js: /follow リクエスト受信 ===');
  try {
    if (typeof followFromArticles.main === 'function') {
      await followFromArticles.main();
      res.send('followFromArticles.js 実行完了');
    } else {
      res.status(500).send('followFromArticles.js に main 関数がありません');
    }
  } catch (e) {
    res.status(500).send('エラー: ' + e.message);
  }
});

// いいねAPI
app.get('/like', async (req, res) => {
  console.log('=== api.js: /like リクエスト受信 ===');
  try {
    if (typeof likeUnlikedNotes.main === 'function') {
      await likeUnlikedNotes.main();
      res.send('likeUnlikedNotes.js 実行完了');
    } else {
      res.status(500).send('likeUnlikedNotes.js に main 関数がありません');
    }
  } catch (e) {
    res.status(500).send('エラー: ' + e.message);
  }
});

// 公開API
app.get('/publish', async (req, res) => {
  console.log('=== api.js: /publish リクエスト受信 ===');
  try {
    if (typeof autoPublishNotes.main === 'function') {
      await autoPublishNotes.main();
      res.send('autoPublishNotes.js 実行完了');
    } else {
      res.status(500).send('autoPublishNotes.js に main 関数がありません');
    }
  } catch (e) {
    res.status(500).send('エラー: ' + e.message);
  }
});

// サーバー起動
app.listen(port, () => {
  console.log(`=== api.js: サーバー起動 http://localhost:${port} ===`);
}); 
