Pod::Spec.new do |s|
  s.name           = 'ReservedRegions'
  s.version        = '1.0.0'
  s.summary        = "Reports a view's reserved regions, such as iPhone Duo's fold, to React Native"
  s.author         = 'Better Rail'
  s.homepage       = 'https://better-rail.co.il'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
