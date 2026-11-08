package com.ashi.system

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.view.WindowManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AshiSystemModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

  override fun getName(): String = "AshiSystem"

  @ReactMethod
  fun setKeepAwake(enabled: Boolean) {
    val activity = currentActivity ?: return
    activity.runOnUiThread {
      if (enabled) {
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      } else {
        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      }
    }
  }

  @ReactMethod
  fun startSessionService(title: String, body: String) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) !=
            PackageManager.PERMISSION_GRANTED) {
      Log.i(SessionForegroundService.TAG, "no BLUETOOTH_CONNECT, skipping foreground service")
      return
    }
    val intent =
        Intent(context, SessionForegroundService::class.java)
            .putExtra(SessionForegroundService.EXTRA_TITLE, title)
            .putExtra(SessionForegroundService.EXTRA_BODY, body)
    try {
      ContextCompat.startForegroundService(context, intent)
    } catch (error: Exception) {
      Log.w(SessionForegroundService.TAG, "could not start session service", error)
    }
  }

  @ReactMethod
  fun stopSessionService() {
    context.stopService(Intent(context, SessionForegroundService::class.java))
  }
}
