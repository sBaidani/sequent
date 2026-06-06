package com.example.sequent.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val eventId = intent.getStringExtra("EVENT_ID") ?: return
        val title = intent.getStringExtra("TITLE") ?: "Upcoming Event"
        
        NotificationHelper.createNotificationChannel(context)
        NotificationHelper.showNotification(
            context = context,
            eventId = eventId,
            title = "Reminder: $title",
            content = "Starts in 15 minutes."
        )
    }
}
