package com.example.sequent.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.background
import androidx.glance.text.FontWeight

class SequentWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            Column(
                modifier = androidx.glance.GlanceModifier
                    .fillMaxSize()
                    .background(ColorProvider(Color(0xFF1A1A1A)))
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Sequent Schedule",
                    style = TextStyle(
                        color = ColorProvider(Color.White),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
                Text(
                    text = "No upcoming events",
                    style = TextStyle(
                        color = ColorProvider(Color.Gray),
                        fontSize = 14.sp
                    ),
                    modifier = androidx.glance.GlanceModifier.padding(top = 8.dp)
                )
            }
        }
    }
}
