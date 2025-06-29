const { TwitterApi } = require('twitter-api-v2');
require('dotenv').config();

(async () => {
  try {
    // .envから認証情報を取得してクライアントを初期化
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
    // テスト投稿内容（日時付き）
    const tweetText = 'APIテスト投稿 ' + new Date().toLocaleString();
    console.log('投稿内容:', tweetText);
    // v2エンドポイントでツイート
    const res = await client.v2.tweet({ text: tweetText });
    console.log('ツイート成功:', res);
  } catch (e) {
    console.error('ツイート失敗:', e);
  }
})(); 
