# AI記事生成サービス
class AiArticleService
  API_URL = 'https://openrouter.ai/api/v1/chat/completions'
  MODEL = 'deepseek/deepseek-chat-v3-0324:free'
  
  # 題材リスト（JavaScriptコードから移植）
  TOPICS = [
    '資産運用の基礎',
    '投資初心者向けガイド',
    '投資信託',
    '投資信託のメリット',
    '株式投資の始め方',
    'FIRE（経済的自立・早期退職）',
    'FIRE達成のための戦略',
    '資産形成の基本',
    '投資初心者の悩み',
    '長期投資のメリット',
    '投資家のマインドセット',
    '資産運用の最初のステップ',
    '効率的な投資ポートフォリオ',
    '投資で失敗しないための心構え',
    '初心者からの資産形成',
    '成功投資家の1日・投資スタイル',
    '自身の投資における成功談・失敗談'
  ].freeze

  # 切り口リスト（JavaScriptコードから移植）
  PATTERNS = [
    '一歩踏み込んだ理解',
    '具体的な活用方法',
    '楽にする方法',
    '投資することのメリット',
    '複利効果の威力',
    'ランキング-トップ5',
    'ランキング-トップ5',
    'ランキング-トップ5',
    'ランキング-トップ5',
    'まつわるQ&Aまとめ',
    'やってはいけないNG行動',
    '初心者が最初の1ヶ月でやることリスト',
    'プロに聞いた極意'
  ].freeze

  def self.generate_article
    # ランダムに題材と切り口を選択
    topic = TOPICS.sample
    pattern = PATTERNS.sample
    
    Rails.logger.info "選ばれた題材: #{topic}"
    Rails.logger.info "選ばれた切り口: #{pattern}"
    
    # AI記事生成
    article = generate_content(topic, pattern)
    
    if article.blank? || article.length < 30
      raise StandardError, 'AI記事生成に失敗、または内容が不十分です'
    end
    
    # タイトル抽出とH1除去
    title, filtered_article = extract_title_and_filter_h1(article)
    
    # 記事リライト・タグ付与
    rewritten_article = rewrite_and_tag_article(filtered_article)
    
    {
      title: title,
      content: rewritten_article,
      topic: topic,
      pattern: pattern
    }
  end

  private

  def self.generate_content(topic, pattern)
    prompt_lines = [
      'あなたは日本語のnote記事編集者です。以下の題材と切り口でnote記事を1本作成してください。',
      '',
      "題材: #{topic}",
      "切り口: #{pattern}",
      '',
      '【条件】',
      '- タイトル、本文、ハッシュタグ（#から始まるもの）を含めてください。',
      '- タイトルは1行目に「# タイトル」として記載してください。',
      '- 本文は見出しや箇条書きも交えて1000文字程度で丁寧にまとめてください。',
      '- ハッシュタグは記事末尾に「#〇〇 #〇〇 ...」の形式でまとめてください。',
      '- すべて日本語で出力してください。',
      '- 切り口に沿った内容になるようにしてください。',
      '- あなたはプロの投資家で、プロの編集者です。',
      '- 読みやすさを重視してください',
      '- もし題材・切り口を鑑みて可能であればランキング形式にしてください',
      '- 改行を多めに入れて、読みやすくしてください。',
      '- 文章作成時に多めに、たくさん絵文字を使用してください。各行に1つくらいは入れてください。',
      '- この記事を読んだ人が投資したい、とモチベーションが上がるような内容にしてください。',
      '- 投資初心者がつい読みたくなるような、やさしく親しみやすい内容にしてください。',
      '- 現役の投資家向けの難しい内容や専門的すぎる話題は避けてください。',
      '- noteの正しいマークダウン記法のみを使ってください。',
      '- 箇条書きはマークダウンではなく、「・ 」で表現してください。',
      '- 見出しはh2（## 見出し）・h3（### 見出し）のみ。',
      '- 番号付きリストは使わないようにしてください。',
      '- h1（# タイトル）はタイトル行のみで本文中では使わないでください。',
      '- その他のマークダウンやHTMLタグは使わないでください。'
    ]
    
    prompt = prompt_lines.join("\n")
    messages = [
      { role: 'system', content: 'あなたは日本語のnote記事編集者です。' },
      { role: 'user', content: prompt }
    ]

    # APIリクエスト（最大3回リトライ）
    3.times do |attempt|
      begin
        response = Faraday.post(API_URL) do |req|
          req.headers['Authorization'] = "Bearer #{ENV['OPENROUTER_API_KEY']}"
          req.headers['Content-Type'] = 'application/json'
          req.body = {
            model: MODEL,
            messages: messages,
            max_tokens: 1200,
            temperature: 0.7
          }.to_json
        end

        data = JSON.parse(response.body)
        
        unless response.success?
          Rails.logger.error "OpenRouter API Error: #{data}"
          raise StandardError, "API error: #{response.status}"
        end
        
        content = data.dig('choices', 0, 'message', 'content')
        if content.present?
          Rails.logger.info "AI記事生成完了 (試行回数: #{attempt + 1})"
          return content
        end
        
      rescue StandardError => e
        Rails.logger.error "AI記事生成エラー (試行#{attempt + 1}): #{e.message}"
        raise e if attempt == 2 # 最後の試行でエラーの場合は例外を投げる
        sleep 1 # 1秒待ってリトライ
      end
    end
    
    raise StandardError, 'AI記事生成に失敗しました'
  end

  def self.extract_title_and_filter_h1(article)
    title = '無題'
    title_match = article.match(/^#\s*(.+)$/m)
    
    if title_match && title_match[1].strip.present?
      title = title_match[1].strip
    else
      # 先頭行がタイトルでない場合、最初の10文字を仮タイトルに
      first_line = article.split("\n").find { |line| line.strip.present? }
      title = first_line&.slice(0, 10) || '無題'
    end

    h1_title_line = "# #{title}"
    filtered_lines = article.split("\n").reject { |line| line.strip == h1_title_line }
    filtered_article = filtered_lines.join("\n")

    Rails.logger.info "抽出されたタイトル: #{title}"
    
    [title, filtered_article]
  end

  def self.rewrite_and_tag_article(content)
    # 簡易版の実装（完全版は必要に応じて後で実装）
    # 記事末尾にフォロー案内とタグを追加
    info_text = [
      '最後までお読みいただきありがとうございます！💬',
      '継続して、お得な情報を発信していきますので、フォローお願いします！'
    ].join("\n")
    
    # 簡易的なタグ生成
    tags = '#投資 #資産運用 #初心者 #FIRE #投資信託'
    
    "#{content.strip}\n\n#{info_text}\n\n#{tags}\n"
  end
end
