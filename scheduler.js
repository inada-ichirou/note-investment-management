import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();

const execAsync = promisify(exec);

// 実行するスクリプトのリスト
const scripts = [
  'autoCreateAndDraftNote.js',
  'follow/followFromArticles.js',
  'likeUnlikedNotes.js',
  'autoPublishNotes.js'
];

// スクリプト実行関数
async function runScript(scriptPath) {
  console.log(`\n=== ${scriptPath} を実行開始 ===`);
  try {
    const { stdout, stderr } = await execAsync(`node ${scriptPath}`, {
      timeout: 300000 // 5分でタイムアウト
    });
    
    if (stdout) {
      console.log(`${scriptPath} の出力:`);
      console.log(stdout);
    }
    
    if (stderr) {
      console.log(`${scriptPath} のエラー出力:`);
      console.log(stderr);
    }
    
    console.log(`=== ${scriptPath} 実行完了 ===`);
    return true;
  } catch (error) {
    console.error(`=== ${scriptPath} 実行エラー ===`);
    console.error('エラー詳細:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.log('stderr:', error.stderr);
    return false;
  }
}

// メイン実行関数
async function main() {
  console.log('=== scheduler.js: main() 開始 ===');
  console.log('定期実行スケジューラーを開始します');
  console.log('実行日時:', new Date().toISOString());
  
  const results = [];
  
  for (const script of scripts) {
    console.log(`=== scheduler.js: ${script} 実行開始 ===`);
    const success = await runScript(script);
    console.log(`=== scheduler.js: ${script} 実行終了 ===`);
    results.push({ script, success });
    
    // スクリプト間で少し待機（API制限対策）
    if (script !== scripts[scripts.length - 1]) {
      console.log('次のスクリプト実行まで30秒待機...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  // 実行結果サマリー
  console.log('\n=== 実行結果サマリー ===');
  results.forEach(({ script, success }) => {
    const status = success ? '✅ 成功' : '❌ 失敗';
    console.log(`${script}: ${status}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  console.log(`\n総合結果: ${successCount}/${totalCount} スクリプトが成功`);
  
  if (successCount === totalCount) {
    console.log('🎉 全てのスクリプトが正常に完了しました');
  } else {
    console.log('⚠️ 一部のスクリプトでエラーが発生しました');
  }
  console.log('=== scheduler.js: main() 終了 ===');
}

// エラーハンドリング付きで実行
main().catch(error => {
  console.error('=== scheduler.js: 予期しないエラー ===', error);
  process.exit(1);
}); 
