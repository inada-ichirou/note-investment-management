require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// const MODEL = 'google/gemini-pro'; // 必要に応じて変更
const MODEL = 'deepseek/deepseek-chat-v3-0324:free';

async function testRequest() {
  if (!API_KEY) {
    console.error('APIキーが設定されていません');
    process.exit(1);
  }
  try {
    const res = await axios.post(API_URL, {
      model: MODEL,
      messages: [
        { role: 'system', content: 'あなたは日本語のnote記事編集者です。' },
        { role: 'user', content: '「テスト見出し」の本文が100文字しかありません。200文字以上になるように厚くリライトしてください。元の本文: これはテストです。' }
      ],
      max_tokens: 300,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('APIレスポンス:', res.data);
  } catch (e) {
    console.error('APIリクエストエラー:', e.response ? e.response.data : e.message);
  }
}

testRequest();
