import Foundation
import UIKit
import React
import LiquidGlassKit

@objc(LiquidGlassView)
final class LiquidGlassViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    LiquidGlassNativeView()
  }
}

final class LiquidGlassNativeView: UIView {
  private var effectView: UIView?

  @objc var glassStyle: NSString = "regular" {
    didSet {
      rebuildEffectView()
    }
  }

  @objc var cornerRadius: NSNumber = 20 {
    didSet {
      applyCornerRadius()
    }
  }

  @objc var isInteractive: Bool = false {
    didSet {
      rebuildEffectView()
    }
  }

  @objc var tintColorHex: NSString? {
    didSet {
      rebuildEffectView()
    }
  }

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    clipsToBounds = true
    rebuildEffectView()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    isUserInteractionEnabled = false
    clipsToBounds = true
    rebuildEffectView()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    effectView?.frame = bounds
    applyCornerRadius()
  }

  private func rebuildEffectView() {
    effectView?.removeFromSuperview()

    let styleValue = String(glassStyle).lowercased()
    let style: LiquidGlassEffect.Style = styleValue == "clear" ? .clear : .regular

    let effect = LiquidGlassEffect(style: style, isNative: true)
    effect.isInteractive = isInteractive
    if let tint = tintColorHex.flatMap({ Self.hexToColor(String($0)) }) {
      effect.tintColor = tint
    }

    let visual = VisualEffectView(effect: effect)
    let hosted = visual as! UIView
    hosted.isUserInteractionEnabled = false
    hosted.frame = bounds
    hosted.autoresizingMask = [.flexibleWidth, .flexibleHeight]

    addSubview(hosted)
    effectView = hosted

    applyCornerRadius()
  }

  private func applyCornerRadius() {
    let radius = CGFloat(truncating: cornerRadius)
    layer.cornerRadius = radius
    effectView?.layer.cornerRadius = radius
    effectView?.layer.cornerCurve = .continuous
    effectView?.clipsToBounds = true
  }

  private static func hexToColor(_ hex: String) -> UIColor? {
    let trimmed = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    guard !trimmed.isEmpty else {
      return nil
    }

    var int: UInt64 = 0
    guard Scanner(string: trimmed).scanHexInt64(&int) else {
      return nil
    }

    let a: UInt64
    let r: UInt64
    let g: UInt64
    let b: UInt64

    switch trimmed.count {
    case 3:
      (a, r, g, b) = (
        255,
        (int >> 8) * 17,
        (int >> 4 & 0xF) * 17,
        (int & 0xF) * 17
      )
    case 6:
      (a, r, g, b) = (
        255,
        int >> 16,
        int >> 8 & 0xFF,
        int & 0xFF
      )
    case 8:
      (r, g, b, a) = (
        int >> 24,
        int >> 16 & 0xFF,
        int >> 8 & 0xFF,
        int & 0xFF
      )
    default:
      return nil
    }

    return UIColor(
      red: CGFloat(r) / 255,
      green: CGFloat(g) / 255,
      blue: CGFloat(b) / 255,
      alpha: CGFloat(a) / 255
    )
  }
}
