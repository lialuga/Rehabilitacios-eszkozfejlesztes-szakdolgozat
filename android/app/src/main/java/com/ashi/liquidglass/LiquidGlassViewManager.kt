package com.ashi.liquidglass

import android.graphics.Color as AndroidColor
import android.graphics.Outline
import android.graphics.RenderEffect
import android.graphics.RuntimeShader
import android.graphics.Shader
import android.os.Build
import android.view.View
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import androidx.annotation.RequiresApi
import androidx.core.graphics.alpha
import androidx.core.graphics.blue
import androidx.core.graphics.green
import androidx.core.graphics.red
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import kotlin.math.max

class LiquidGlassViewManager : SimpleViewManager<LiquidGlassNativeView>() {
  override fun getName(): String = "LiquidGlassView"

  override fun createViewInstance(reactContext: ThemedReactContext): LiquidGlassNativeView {
    return LiquidGlassNativeView(reactContext)
  }

  @ReactProp(name = "glassStyle")
  fun setGlassStyle(view: LiquidGlassNativeView, style: String?) {
    view.glassStyle = style ?: "regular"
  }

  @ReactProp(name = "cornerRadius", defaultFloat = 20f)
  fun setCornerRadius(view: LiquidGlassNativeView, radius: Float) {
    view.cornerRadius = radius
  }

  @ReactProp(name = "isInteractive", defaultBoolean = false)
  fun setIsInteractive(view: LiquidGlassNativeView, isInteractive: Boolean) {
    view.isInteractive = isInteractive
  }

  @ReactProp(name = "tintColorHex")
  fun setTintColorHex(view: LiquidGlassNativeView, tintColorHex: String?) {
    view.tintColorHex = tintColorHex
  }
}

class LiquidGlassNativeView(context: ThemedReactContext) : FrameLayout(context) {
  var glassStyle: String = "regular"
    set(value) {
      field = value
      applyAppearance()
    }

  var cornerRadius: Float = 20f
    set(value) {
      field = value
      updateOutlineAndAppearance()
    }

  var isInteractive: Boolean = false
    set(value) {
      field = value
      applyInteractiveState()
    }

  var tintColorHex: String? = null
    set(value) {
      field = value
      applyAppearance()
    }

  init {
    clipToOutline = true
    setWillNotDraw(false)
    outlineProvider = object : ViewOutlineProvider() {
      override fun getOutline(view: View, outline: Outline) {
        outline.setRoundRect(0, 0, view.width, view.height, cornerRadiusPx())
      }
    }

    applyInteractiveState()
    applyAppearance()
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    updateOutlineAndAppearance()
  }

  private fun updateOutlineAndAppearance() {
    invalidateOutline()
    applyAppearance()
  }

  private fun applyAppearance() {
    setBackgroundColor(resolveTintColor())
    applyRenderEffect()
  }

  private fun applyInteractiveState() {
    val scale = if (isInteractive) 1.02f else 1f
    scaleX = scale
    scaleY = scale
  }

  private fun applyRenderEffect() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return
    }

    val density = resources.displayMetrics.density
    val isClear = glassStyle.equals("clear", ignoreCase = true)
    val blurRadius = if (isClear) 6f * density else 14f * density

    var effect: RenderEffect =
        RenderEffect.createBlurEffect(blurRadius, blurRadius, Shader.TileMode.CLAMP)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val widthValue = max(width.toFloat(), 1f)
      val heightValue = max(height.toFloat(), 1f)
      val radius = cornerRadiusPx()

      val shader = RuntimeShader(ROUNDED_RECT_REFRACTION_SHADER)
      shader.setFloatUniform("size", widthValue, heightValue)
      shader.setFloatUniform("offset", 0f, 0f)
      shader.setFloatUniform("cornerRadii", radius, radius, radius, radius)
      shader.setFloatUniform("refractionHeight", if (isClear) 12f * density else 20f * density)
      shader.setFloatUniform("refractionAmount", if (isClear) 8f * density else 16f * density)
      shader.setFloatUniform("depthEffect", if (isClear) 0.02f else 0.06f)
      shader.setFloatUniform("chromaticAberration", if (isClear) 0f else 1.5f * density)

      val refraction = RenderEffect.createRuntimeShaderEffect(shader, "content")
      effect = RenderEffect.createChainEffect(refraction, effect)
    }

    setRenderEffect(effect)
  }

  private fun resolveTintColor(): Int {
    val fallback = if (glassStyle.equals("clear", ignoreCase = true)) {
      AndroidColor.argb(34, 255, 255, 255)
    } else {
      AndroidColor.argb(56, 255, 255, 255)
    }

    val tint = tintColorHex?.let(::parseHexColor) ?: fallback
    val alphaBoost = if (glassStyle.equals("clear", ignoreCase = true)) 0.65f else 0.85f
    return AndroidColor.argb(
        (tint.alpha * alphaBoost).toInt().coerceIn(0, 255),
        tint.red,
        tint.green,
        tint.blue)
  }

  private fun cornerRadiusPx(): Float =
      cornerRadius.coerceAtLeast(0f) * resources.displayMetrics.density

  private fun parseHexColor(rawHex: String): Int {
    val clean = rawHex.trim().removePrefix("#")
    return when (clean.length) {
      3 -> {
        val r = "${clean[0]}${clean[0]}"
        val g = "${clean[1]}${clean[1]}"
        val b = "${clean[2]}${clean[2]}"
        AndroidColor.parseColor("#$r$g$b")
      }
      6 -> AndroidColor.parseColor("#$clean")
      8 -> {
        val aarrggbb = "#${clean.substring(6, 8)}${clean.substring(0, 6)}"
        AndroidColor.parseColor(aarrggbb)
      }
      else -> AndroidColor.WHITE
    }
  }
}

// Adapted from Kyant0/AndroidLiquidGlass AGSL refraction approach.
@RequiresApi(Build.VERSION_CODES.TIRAMISU)
private const val ROUNDED_RECT_REFRACTION_SHADER = """
uniform shader content;

uniform float2 size;
uniform float2 offset;
uniform float4 cornerRadii;
uniform float refractionHeight;
uniform float refractionAmount;
uniform float depthEffect;
uniform float chromaticAberration;

float radiusAt(float2 coord, float4 radii) {
    if (coord.x >= 0.0) {
        if (coord.y <= 0.0) return radii.y;
        else return radii.z;
    } else {
        if (coord.y <= 0.0) return radii.x;
        else return radii.w;
    }
}

float sdRoundedRect(float2 p, float2 b, float r) {
    float2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float circleMap(float x) {
    return 1.0 - sqrt(max(0.0, 1.0 - x * x));
}

half4 main(float2 coord) {
    float2 halfSize = size * 0.5;
    float2 centeredCoord = (coord + offset) - halfSize;
    float radius = radiusAt(coord, cornerRadii);

    float sd = sdRoundedRect(centeredCoord, halfSize, radius);
    if (sd > 0.0) {
        return content.eval(coord);
    }

    float y = clamp(1.0 - abs(centeredCoord.y) / max(refractionHeight, 0.0001), 0.0, 1.0);
    float refraction = circleMap(y) * refractionAmount;
    float2 direction = normalize(centeredCoord + float2(0.0001, 0.0001));
    float2 refractedCoord = coord + direction * refraction + centeredCoord * depthEffect;
    half4 baseColor = content.eval(refractedCoord);

    if (chromaticAberration <= 0.0) {
        return baseColor;
    }

    half4 r = content.eval(refractedCoord + float2(chromaticAberration, 0.0));
    half4 b = content.eval(refractedCoord - float2(chromaticAberration, 0.0));
    return half4(r.r, baseColor.g, b.b, baseColor.a);
}
"""
