package com.example.sequent.notifications

// import com.google.firebase.messaging.FirebaseMessagingService
// import com.google.firebase.messaging.RemoteMessage

/*
 * NOTE: To enable this service, you need to:
 * 1. Add google-services.json to the app/ directory.
 * 2. Add 'com.google.gms.google-services' plugin to build.gradle.kts.
 * 3. Add 'implementation("com.google.firebase:firebase-messaging-ktx:23.4.1")'.
 * 4. Uncomment the code below.
 */

/*
class FcmService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // TODO: Send this token to Supabase/Your Backend so the server knows where to push notifications
        // SyncRepository.updateDeviceToken(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        
        // FCM automatically handles notifications when the app is in the background.
        // When the app is in the foreground, this callback is triggered.
        
        val title = message.notification?.title ?: "Update"
        val body = message.notification?.body ?: ""
        
        NotificationHelper.createNotificationChannel(applicationContext)
        NotificationHelper.showNotification(
            context = applicationContext,
            eventId = message.data["event_id"] ?: "0",
            title = title,
            content = body
        )
    }
}
*/
