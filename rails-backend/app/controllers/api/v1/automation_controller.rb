class Api::V1::AutomationController < ApplicationController
  # autoCreateAndDraftNote.jsの機能をRailsで実装
  def create_draft
    Rails.logger.info '=== 記事自動作成・下書き保存開始 ==='
    
    begin
      # 環境変数チェック
      unless ENV['OPENROUTER_API_KEY'].present?
        raise StandardError, 'OPENROUTER_API_KEY環境変数が設定されていません'
      end
      
      unless ENV['NOTE_EMAIL'].present? && ENV['NOTE_PASSWORD'].present?
        raise StandardError, 'NOTE_EMAIL or NOTE_PASSWORD環境変数が設定されていません'
      end

      # 1. AI記事生成
      Rails.logger.info 'AI記事生成中...'
      article_data = AiArticleService.generate_article
      
      Rails.logger.info "生成された記事タイトル: #{article_data[:title]}"
      Rails.logger.info "記事内容の長さ: #{article_data[:content].length}文字"

      # 2. Note.comに下書き保存
      Rails.logger.info 'Note.comに下書き保存中...'
      note_service = NoteService.new
      
      # ログイン
      unless note_service.login(ENV['NOTE_EMAIL'], ENV['NOTE_PASSWORD'])
        raise StandardError, 'Note.comログインに失敗しました'
      end
      
      # 下書き作成
      draft_id = note_service.create_draft(article_data[:title], article_data[:content])
      
      if draft_id.nil?
        raise StandardError, '下書き作成に失敗しました'
      end

      Rails.logger.info '=== 記事自動作成・下書き保存完了 ==='
      
      # 成功レスポンス
      render json: {
        status: 'success',
        message: 'Note記事の下書き作成が完了しました',
        data: {
          draft_id: draft_id,
          title: article_data[:title],
          topic: article_data[:topic],
          pattern: article_data[:pattern],
          content_length: article_data[:content].length,
          timestamp: Time.current.iso8601
        }
      }
      
    rescue StandardError => e
      Rails.logger.error "記事作成エラー: #{e.message}"
      Rails.logger.error e.backtrace.join("\n") if Rails.env.development?
      
      # エラーレスポンス
      render json: {
        status: 'error',
        message: e.message,
        timestamp: Time.current.iso8601
      }, status: :internal_server_error
    end
  end

  # ヘルスチェック用エンドポイント
  def health_check
    render json: {
      status: 'ok',
      service: 'note-automation-api',
      timestamp: Time.current.iso8601,
      environment: Rails.env,
      version: '1.0.0'
    }
  end
end
