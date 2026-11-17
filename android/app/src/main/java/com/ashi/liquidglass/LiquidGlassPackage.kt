// Source: React Native "Android Native UI Components" guide (MIT), https://reactnative.dev/docs/legacy/native-components-android
package com.ashi.liquidglass

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class LiquidGlassPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
      emptyList()

  override fun createViewManagers(
      reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> =
      listOf(LiquidGlassViewManager())
}
