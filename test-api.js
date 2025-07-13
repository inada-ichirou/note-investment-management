// OpenRouter APIの接続をテストするスクリプト
require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.OPENROUTER_API_KEY?.trim();
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

console.log('=== OpenRouter API テスト ===');
console.log('APIキー:', API_KEY ? '設定済み' : '未設定');

if (!API_KEY) {
  console.error('APIキーが設定されていません');
  process.exit(1);
}

async function testAPI() {
  try {
    console.log('APIリクエスト送信中...');
    
    const response = await axios.post(API_URL, {
      model: 'deepseek/deepseek-chat-v3-0324:free',
      messages: [
        { role: 'user', content: 'こんにちは' }
      ],
      max_tokens: 50
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API接続成功');
    console.log('レスポンス:', response.data.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ API接続失敗');
    console.error('エラー:', error.message);
    if (error.response) {
      console.error('ステータス:', error.response.status);
      console.error('データ:', error.response.data);
    }
  }
}

testAPI(); 
