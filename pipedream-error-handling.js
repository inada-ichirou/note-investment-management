// エラーハンドリング機能
async function handleError(error, context) {
  console.error('エラーが発生しました:', error);
  
  // エラーの種類に応じた処理
  if (error.message.includes('timeout')) {
    return {
      success: false,
      error: 'タイムアウトエラー',
      retry: true
    };
  }
  
  if (error.message.includes('selector')) {
    return {
      success: false,
      error: 'ページ要素が見つかりません',
      retry: false
    };
  }
  
  return {
    success: false,
    error: error.message,
    retry: false
  };
}

// リトライ機能
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`試行 ${i + 1} 失敗:`, error.message);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000 * (i + 1)));
    }
  }
} 
