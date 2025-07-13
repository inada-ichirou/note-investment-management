// 代替のAI APIをテストするスクリプト
require('dotenv').config();
const axios = require('axios');

console.log('=== 代替AI API テスト ===');

// 1. OpenRouter API（現在の設定）
async function testOpenRouter() {
  console.log('\n1. OpenRouter API テスト');
  const API_KEY = process.env.OPENROUTER_API_KEY?.trim();
  
  if (!API_KEY) {
    console.log('❌ APIキーが設定されていません');
    return;
  }
  
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'deepseek/deepseek-chat-v3-0324:free',
      messages: [{ role: 'user', content: 'こんにちは' }],
      max_tokens: 50
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ OpenRouter API 成功');
    console.log('レスポンス:', response.data.choices[0].message.content);
    
  } catch (error) {
    console.log('❌ OpenRouter API 失敗:', error.response?.status, error.response?.data?.error?.message);
  }
}

// 2. 他の無料AI API（例：Hugging Face）
async function testHuggingFace() {
  console.log('\n2. Hugging Face API テスト');
  
  try {
    const response = await axios.post('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
      inputs: 'こんにちは'
    }, {
      headers: {
        'Authorization': 'Bearer hf_xxx', // 実際のAPIキーが必要
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Hugging Face API 成功');
    
  } catch (error) {
    console.log('❌ Hugging Face API 失敗:', error.response?.status);
  }
}

// テスト実行
async function runTests() {
  await testOpenRouter();
  await testHuggingFace();
  
  console.log('\n=== 推奨事項 ===');
  console.log('1. OpenRouterで新しいAPIキーを取得');
  console.log('2. クレジットを追加');
  console.log('3. APIキーの権限を確認');
  console.log('4. または他の無料AI APIを検討');
}

runTests(); 
