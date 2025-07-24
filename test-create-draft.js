// ローカルテスト用: create-draft関数のテスト
import dotenv from 'dotenv';
import handler from './api/create-draft.js';

// 環境変数を読み込み
dotenv.config();

// モックリクエストとレスポンス
const mockReq = {
  method: 'GET',
  headers: {},
  query: {}
};

const mockRes = {
  status: (code) => {
    console.log(`Status: ${code}`);
    return mockRes;
  },
  json: (data) => {
    console.log('Response:', JSON.stringify(data, null, 2));
    return mockRes;
  },
  send: (data) => {
    console.log('Response:', data);
    return mockRes;
  }
};

// テスト実行
console.log('=== ローカルテスト開始 ===');
console.log('時刻:', new Date().toISOString());

try {
  await handler(mockReq, mockRes);
  console.log('=== テスト完了 ===');
} catch (error) {
  console.error('=== エラー発生 ===');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
} 
