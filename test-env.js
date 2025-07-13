// 環境変数の読み込みをテストするスクリプト
console.log('=== 環境変数テスト開始 ===');

// dotenvの読み込み
console.log('1. dotenv読み込み前の環境変数:');
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '設定済み' : '未設定');

// dotenvを読み込み
console.log('\n2. dotenv読み込み開始...');
require('dotenv').config();
console.log('dotenv読み込み完了');

// 読み込み後の環境変数
console.log('\n3. dotenv読み込み後の環境変数:');
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '設定済み' : '未設定');
console.log('NOTE_EMAIL:', process.env.NOTE_EMAIL ? '設定済み' : '未設定');
console.log('NOTE_PASSWORD:', process.env.NOTE_PASSWORD ? '設定済み' : '未設定');

// APIキーの詳細確認（セキュリティのため一部のみ表示）
if (process.env.OPENROUTER_API_KEY) {
  console.log('APIキーの先頭10文字:', process.env.OPENROUTER_API_KEY.substring(0, 10) + '...');
} else {
  console.log('APIキーが未設定です');
}

console.log('\n=== 環境変数テスト完了 ==='); 
