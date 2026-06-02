package com.example.sequent.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.sequent.theme.DarkBorder
import com.example.sequent.theme.DarkCard
import com.example.sequent.theme.LightBorder
import com.example.sequent.theme.LightCard

/**
 * Applies a glassmorphism effect to the composable.
 * This includes a semi-transparent background, subtle border, and rounded corners.
 */
fun Modifier.glassmorphism(
    cornerRadius: Dp = 16.dp,
    darkTheme: Boolean? = null
): Modifier = composed {
    val isDark = darkTheme ?: isSystemInDarkTheme()
    
    val backgroundColor = if (isDark) DarkCard else LightCard
    val borderColor = if (isDark) DarkBorder else LightBorder
    
    this
        .clip(RoundedCornerShape(cornerRadius))
        .background(backgroundColor)
        .border(
            width = 1.dp,
            color = borderColor,
            shape = RoundedCornerShape(cornerRadius)
        )
}
