// scheduler.jsのローカルテスト
import dotenv from 'dotenv';
import scheduler from './api/scheduler.js';

// 環境変数を読み込み
dotenv.config();

console.log('=== スケジューラーテスト開始 ===');
console.log('時刻:', new Date().toISOString());

// モックリクエストとレスポンスオブジェクト
const mockReq = {
  method: 'GET',
  headers: {},
  body: {}
};

const mockRes = {
  status: (code) => {
    console.log('Response Status:', code);
    return mockRes;
  },
  json: (data) => {
    console.log('Response Data:', JSON.stringify(data, null, 2));
    return mockRes;
  }
};

// スケジューラーを実行
try {
  await scheduler(mockReq, mockRes);
  console.log('=== スケジューラーテスト完了 ===');
} catch (error) {
  console.error('スケジューラーテストエラー:', error);
} 
