package com.example.sequent.notifications

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.example.sequent.MainActivity
import com.example.sequent.R
import java.time.Instant

object NotificationHelper {
    const val CHANNEL_ID = "sequent_reminders"

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Event Reminders"
            val descriptionText = "Notifications for upcoming scheduled events"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager: NotificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun showNotification(context: Context, eventId: String, title: String, content: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("EVENT_ID", eventId) // For deep linking
        }
        val pendingIntent: PendingIntent = PendingIntent.getActivity(
            context, eventId.hashCode(), intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(eventId.hashCode(), builder.build())
    }

    fun scheduleReminder(context: Context, eventId: String, title: String, timeIso: String) {
        try {
            // Parse ISO string and subtract 15 minutes
            val eventTime = Instant.parse(timeIso)
            val reminderTime = eventTime.minusSeconds(15 * 60).toEpochMilli()

            if (reminderTime <= System.currentTimeMillis()) return // Already past

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, ReminderReceiver::class.java).apply {
                putExtra("EVENT_ID", eventId)
                putExtra("TITLE", title)
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context, 
                eventId.hashCode(), 
                intent, 
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, reminderTime, pendingIntent)
                } else {
                    // Fallback to inexact if permission denied
                    alarmManager.set(AlarmManager.RTC_WAKEUP, reminderTime, pendingIntent)
                }
            } else {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, reminderTime, pendingIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
