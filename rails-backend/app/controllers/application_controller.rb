class ApplicationController < ActionController::API
  # CSRF保護を無効化（API専用）
  protect_from_forgery with: :null_session
  
  def health
    render json: { status: 'ok', timestamp: Time.current.iso8601 }
  end
end
