Pod::Spec.new do |s|
  s.name             = 'LiquidGlassKit'
  s.version          = '0.1.0'
  s.summary          = 'Backport of Apple liquid glass visual effects.'
  s.description      = 'Local vendored dependency of DnV1eX/LiquidGlassKit for RN iOS integration.'
  s.homepage         = 'https://github.com/DnV1eX/LiquidGlassKit'
  # The upstream repository has NO licence file (checked 2026-11-04 via the GitHub API:
  # "license": null). Without a licence the code is all-rights-reserved; see THIRD_PARTY_NOTICES.md.
  s.license          = { :type => 'Unlicensed (no upstream licence)', :text => 'No licence granted upstream. See THIRD_PARTY_NOTICES.md.' }
  s.author           = { 'DnV1eX' => 'opensource@localhost' }
  s.platform         = :ios, '13.0'
  s.source           = { :path => '.' }

  s.swift_versions   = ['6.0', '6.2']
  s.static_framework = true

  s.source_files = 'Sources/LiquidGlassKit/**/*.swift'
  s.resources = 'Sources/LiquidGlassKit/*.metal'

  s.frameworks = [
    'UIKit',
    'Metal',
    'MetalKit',
    'MetalPerformanceShaders',
    'CoreVideo'
  ]

  s.pod_target_xcconfig = {
    'SWIFT_VERSION' => '6.2'
  }
end
