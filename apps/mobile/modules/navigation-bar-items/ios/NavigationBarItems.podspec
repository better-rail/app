Pod::Spec.new do |s|
  s.name           = 'NavigationBarItems'
  s.version        = '1.0.0'
  s.summary        = 'Bar button items for the navigation bar of the view controller hosting a view'
  s.author         = ''
  s.homepage       = 'https://better-rail.co.il'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,swift}'
end
