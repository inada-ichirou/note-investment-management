// dotenvの読み込みをテストするスクリプト
console.log('=== dotenvテスト開始 ===');

// 1. dotenv読み込み前の環境変数
console.log('\n1. dotenv読み込み前:');
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '設定済み' : '未設定');

// 2. dotenvを読み込み
console.log('\n2. dotenv読み込み開始...');
try {
  require('dotenv').config();
  console.log('dotenv読み込み成功');
} catch (error) {
  console.error('dotenv読み込みエラー:', error.message);
}

// 3. 読み込み後の環境変数
console.log('\n3. dotenv読み込み後:');
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '設定済み' : '未設定');
console.log('NOTE_EMAIL:', process.env.NOTE_EMAIL ? '設定済み' : '未設定');
console.log('NOTE_PASSWORD:', process.env.NOTE_PASSWORD ? '設定済み' : '未設定');

// 4. .envファイルの存在確認
const fs = require('fs');
const path = require('path');

console.log('\n4. .envファイル確認:');
const envPath = path.join(__dirname, '.env');
console.log('.envファイルパス:', envPath);
console.log('.envファイル存在:', fs.existsSync(envPath) ? 'あり' : 'なし');

if (fs.existsSync(envPath)) {
  const stats = fs.statSync(envPath);
  console.log('.envファイルサイズ:', stats.size, 'bytes');
  
  // ファイルの内容を確認（最初の数行のみ）
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('.envファイル内容（最初の3行）:');
  content.split('\n').slice(0, 3).forEach((line, index) => {
    console.log(`  ${index + 1}: ${line}`);
  });
}

console.log('\n=== dotenvテスト完了 ==='); 
