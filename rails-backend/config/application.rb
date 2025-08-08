require_relative "boot"

require "rails/all"

Bundler.require(*Rails.groups)

module NoteAutomationBackend
  class Application < Rails::Application
    config.load_defaults 7.0
    
    # APIモード設定
    config.api_only = true
    
    # CORS設定
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins '*'
        resource '*',
          headers: :any,
          methods: [:get, :post, :put, :patch, :delete, :options, :head],
          credentials: false
      end
    end
    
    # タイムゾーン設定
    config.time_zone = 'Tokyo'
  end
end
