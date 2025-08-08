Rails.application.routes.draw do
  # APIエンドポイント
  namespace :api do
    namespace :v1 do
      post 'create_draft', to: 'automation#create_draft'
      get 'health_check', to: 'automation#health_check'
    end
  end

  # ヘルスチェック用
  get 'health', to: 'application#health'
end
