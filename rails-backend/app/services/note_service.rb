# Note.com操作サービス（Mechanizeを使用）
class NoteService
  require 'mechanize'
  require 'cgi'

  def initialize
    @agent = Mechanize.new
    @agent.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    @logged_in = false
  end

  # ログイン処理
  def login(email, password)
    return true if @logged_in

    Rails.logger.info 'Note.comにログイン中...'
    
    begin
      # ログインページにアクセス
      login_page = @agent.get('https://note.com/login')
      
      # フォームを探す
      form = login_page.form_with(action: '/api/v1/login') || 
             login_page.forms.find { |f| f.action.include?('login') }
      
      if form.nil?
        Rails.logger.error 'ログインフォームが見つかりません'
        return false
      end

      # メールアドレスとパスワードを入力
      email_field = form.field_with(name: 'email') || form.field_with(id: 'email')
      password_field = form.field_with(name: 'password') || form.field_with(id: 'password')
      
      if email_field && password_field
        email_field.value = email
        password_field.value = password
      else
        Rails.logger.error 'メールアドレスまたはパスワードフィールドが見つかりません'
        return false
      end

      # フォーム送信
      result_page = @agent.submit(form)
      
      # ログイン成功判定
      if result_page.uri.to_s.include?('dashboard') || 
         result_page.body.include?('ダッシュボード') ||
         result_page.body.include?('userIcon')
        Rails.logger.info 'ログイン成功'
        @logged_in = true
        return true
      else
        Rails.logger.error 'ログイン失敗'
        Rails.logger.error "リダイレクト先URL: #{result_page.uri}"
        return false
      end
      
    rescue StandardError => e
      Rails.logger.error "ログインエラー: #{e.message}"
      return false
    end
  end

  # 下書き作成
  def create_draft(title, content)
    unless @logged_in
      Rails.logger.error 'ログインしていません'
      return nil
    end

    Rails.logger.info '記事の下書きを作成中...'
    
    begin
      # 新規投稿ページにアクセス
      new_post_page = @agent.get('https://note.com/notes/new')
      
      # CSRFトークンを取得
      csrf_token = extract_csrf_token(new_post_page)
      
      # APIエンドポイントに直接POSTリクエスト
      post_data = {
        note: {
          name: title,
          body: content,
          status: 'draft', # 下書きとして保存
          eye_catch_type: 'none'
        }
      }

      response = @agent.post(
        'https://note.com/api/v1/notes',
        post_data.to_json,
        {
          'Content-Type' => 'application/json',
          'X-CSRF-Token' => csrf_token,
          'X-Requested-With' => 'XMLHttpRequest'
        }
      )

      if response.code == '201'
        result = JSON.parse(response.body)
        draft_id = result['id']
        Rails.logger.info "下書き作成成功: ID #{draft_id}"
        return draft_id
      else
        Rails.logger.error "下書き作成失敗: ステータスコード #{response.code}"
        Rails.logger.error "レスポンス: #{response.body}"
        return nil
      end
      
    rescue StandardError => e
      Rails.logger.error "下書き作成エラー: #{e.message}"
      return nil
    end
  end

  # ユーザー検索
  def search_users(keyword)
    Rails.logger.info "キーワード「#{keyword}」でユーザー検索中..."
    
    begin
      search_url = "https://note.com/search?q=#{CGI.escape(keyword)}&context=note"
      search_page = @agent.get(search_url)
      
      users = []
      # note記事の作者情報を抽出
      search_page.search('.o-largeNoteSummary').each do |article_node|
        author_node = article_node.at('.o-largeNoteSummary__userName')
        author_link = article_node.at('a[href*="/"]')
        
        if author_node && author_link
          author_name = author_node.text.strip
          author_url = author_link['href']
          
          # 相対URLを絶対URLに変換
          author_url = "https://note.com#{author_url}" unless author_url.start_with?('http')
          
          users << {
            name: author_name,
            url: author_url,
            user_id: extract_user_id_from_url(author_url)
          }
        end
      end
      
      # 重複除去
      users.uniq { |user| user[:user_id] }
      
    rescue StandardError => e
      Rails.logger.error "ユーザー検索エラー: #{e.message}"
      []
    end
  end

  # フォロー処理
  def follow_user(user_id)
    unless @logged_in
      Rails.logger.error 'ログインしていません'
      return false
    end

    Rails.logger.info "ユーザー #{user_id} をフォロー中..."
    
    begin
      # CSRFトークンが必要な場合に備えて取得
      dashboard_page = @agent.get('https://note.com/')
      csrf_token = extract_csrf_token(dashboard_page)
      
      follow_url = "https://note.com/api/v1/users/#{user_id}/following"
      
      response = @agent.post(
        follow_url,
        '{}',
        {
          'Content-Type' => 'application/json',
          'X-CSRF-Token' => csrf_token,
          'X-Requested-With' => 'XMLHttpRequest'
        }
      )
      
      success = response.code == '200' || response.code == '201'
      
      if success
        Rails.logger.info "フォロー成功: #{user_id}"
      else
        Rails.logger.error "フォロー失敗: #{user_id} (ステータス: #{response.code})"
      end
      
      success
      
    rescue StandardError => e
      Rails.logger.error "フォローエラー: #{e.message}"
      false
    end
  end

  private

  # CSRFトークンを抽出
  def extract_csrf_token(page)
    csrf_meta = page.at('meta[name="csrf-token"]')
    csrf_meta ? csrf_meta['content'] : ''
  end

  # URLからユーザーIDを抽出
  def extract_user_id_from_url(url)
    # https://note.com/username 形式からusernameを抽出
    match = url.match(%r{https://note\.com/([^/]+)})
    match ? match[1] : nil
  end
end
