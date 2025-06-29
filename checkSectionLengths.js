// 記事のセクションの文字数をチェックする

const fs = require('fs');

function checkSectionLengths(mdPath, minLength = 200) {
  let raw;
  try {
    raw = fs.readFileSync(mdPath, 'utf-8');
  } catch (e) {
    console.error(`ファイルが存在しないか読み込めません: ${mdPath}`);
    return;
  }
  // ## または ### 見出しごとに分割
  const sections = raw.split(/^##+ /m).slice(1); // 2個以上の#で分割
  console.log(`検出されたセクション数: ${sections.length}`);
  if (sections.length === 0) {
    console.warn('##/### 見出しが検出されませんでした。見出しの書式やスペースを確認してください。');
    return;
  }
  for (const section of sections) {
    const lines = section.split('\n');
    const heading = lines[0].trim();
    // 本文は見出しの次の行から、空行や次の見出し・---まで
    let body = '';
    for (let i = 1; i < lines.length; i++) {
      // 2個以上の#で始まる行や---で区切る
      if (/^##+ /.test(lines[i]) || lines[i].startsWith('---')) break;
      body += lines[i].trim();
    }
    const len = body.length;
    if (len < minLength) {
      console.log(`「${heading}」の本文が${len}文字と少なめです`);
    } else {
      console.log(`「${heading}」の本文は${len}文字（OK）`);
    }
  }
}

// コマンドライン引数対応
const target = process.argv[2];
if (!target) {
  console.error('チェックするMarkdownファイルのパスを指定してください。');
  process.exit(1);
}
checkSectionLengths(target, 200);

// 実行例
// checkSectionLengths('posts/22__2025-05-25-ママ友地獄から抜け出す方法.md', 200); 
