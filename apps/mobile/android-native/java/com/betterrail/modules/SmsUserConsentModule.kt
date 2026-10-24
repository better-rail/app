package com.betterrail.modules

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.core.content.ContextCompat
import androidx.core.content.IntentCompat
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.common.LifecycleState
import com.facebook.react.module.annotations.ReactModule
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status

/**
 * Reads the voucher code SMS through the SMS User Consent API: the rider approves sharing that one message,
 * so the app needs no SMS permission and Israel Railways' text needs no app hash.
 * State is only touched on the main thread.
 */
@ReactModule(name = SmsUserConsentModule.NAME)
class SmsUserConsentModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener, LifecycleEventListener {

    private var receiver: BroadcastReceiver? = null
    // Held until the app is in the foreground, which Android needs to show the prompt
    private var consentIntent: Intent? = null
    private var isAwaitingConsent = false
    private var pendingMessage: String? = null
    private var listenerCount = 0

    init {
        reactContext.addActivityEventListener(this)
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String = NAME

    /** Listens for the next SMS for up to five minutes, replacing an earlier listen. False without Play services. */
    @ReactMethod
    fun start(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            stopListening()
            val context = reactApplicationContext
            if (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) != ConnectionResult.SUCCESS) {
                promise.resolve(false)
                return@runOnUiThread
            }

            val smsReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) = onSmsRetrieved(this, intent)
            }
            try {
                ContextCompat.registerReceiver(
                    context,
                    smsReceiver,
                    IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION),
                    SmsRetriever.SEND_PERMISSION,
                    null,
                    ContextCompat.RECEIVER_EXPORTED,
                )
                receiver = smsReceiver
                SmsRetriever.getClient(context).startSmsUserConsent(null)
                    .addOnSuccessListener { promise.resolve(true) }
                    .addOnFailureListener {
                        if (receiver === smsReceiver) unregisterReceiver()
                        promise.resolve(false)
                    }
            } catch (e: Exception) {
                unregisterReceiver()
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun stop() {
        UiThreadUtil.runOnUiThread { stopListening() }
    }

    /** The shared SMS when it arrived before JS subscribed. Cleared once read. */
    @ReactMethod
    fun consumePendingMessage(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            promise.resolve(pendingMessage)
            pendingMessage = null
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        UiThreadUtil.runOnUiThread { listenerCount++ }
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        UiThreadUtil.runOnUiThread { listenerCount = maxOf(0, listenerCount - count) }
    }

    private fun onSmsRetrieved(smsReceiver: BroadcastReceiver, intent: Intent) {
        if (intent.action != SmsRetriever.SMS_RETRIEVED_ACTION || receiver !== smsReceiver) return
        val status = IntentCompat.getParcelableExtra(intent, SmsRetriever.EXTRA_STATUS, Status::class.java) ?: return
        when (status.statusCode) {
            CommonStatusCodes.SUCCESS -> {
                // Each listen delivers a single message
                unregisterReceiver()
                consentIntent = IntentCompat.getParcelableExtra(intent, SmsRetriever.EXTRA_CONSENT_INTENT, Intent::class.java)
                showConsent()
            }
            CommonStatusCodes.TIMEOUT -> unregisterReceiver()
        }
    }

    private fun showConsent() {
        val intent = consentIntent ?: return
        val activity = reactApplicationContext.currentActivity ?: return
        if (reactApplicationContext.lifecycleState != LifecycleState.RESUMED) return
        consentIntent = null

        // Launch only Play services' own prompt, without passing on access to the app's content URIs
        if (intent.resolveActivity(activity.packageManager)?.packageName != GMS_PACKAGE) return
        intent.removeFlags(URI_GRANT_FLAGS)
        try {
            activity.startActivityForResult(intent, REQUEST_CODE)
            isAwaitingConsent = true
        } catch (e: Exception) {
            // The rider types the code instead
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_CODE || !isAwaitingConsent) return
        isAwaitingConsent = false
        val message = data?.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE)
        if (resultCode != Activity.RESULT_OK || message == null) return

        if (listenerCount > 0) {
            reactApplicationContext.emitDeviceEvent(EVENT_MESSAGE, message)
        } else {
            pendingMessage = message
        }
    }

    override fun onNewIntent(intent: Intent) = Unit

    override fun onHostResume() = showConsent()

    override fun onHostPause() = Unit

    override fun onHostDestroy() = Unit

    override fun invalidate() {
        reactApplicationContext.removeActivityEventListener(this)
        reactApplicationContext.removeLifecycleEventListener(this)
        UiThreadUtil.runOnUiThread { stopListening() }
        super.invalidate()
    }

    private fun stopListening() {
        unregisterReceiver()
        consentIntent = null
        isAwaitingConsent = false
        pendingMessage = null
    }

    private fun unregisterReceiver() {
        val current = receiver ?: return
        receiver = null
        try {
            reactApplicationContext.unregisterReceiver(current)
        } catch (e: IllegalArgumentException) {
            // Already unregistered
        }
    }

    companion object {
        const val NAME = "SmsUserConsent"
        const val EVENT_MESSAGE = "SmsUserConsentMessage"
        private const val GMS_PACKAGE = "com.google.android.gms"
        private const val REQUEST_CODE = 0x5C0D
        private const val URI_GRANT_FLAGS = Intent.FLAG_GRANT_READ_URI_PERMISSION or
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or
            Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
    }
}
