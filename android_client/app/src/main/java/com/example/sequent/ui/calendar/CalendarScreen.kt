package com.example.sequent.ui.calendar

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun CalendarScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F0F0F))
            .padding(24.dp)
    ) {
        Text("Calendar", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(32.dp))
        
        // Month / Year Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("June 2026", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Row {
                Text("<", color = Color.Gray, fontSize = 24.sp, modifier = Modifier.padding(horizontal = 8.dp))
                Text(">", color = Color.Gray, fontSize = 24.sp, modifier = Modifier.padding(horizontal = 8.dp))
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Days of week
        val daysOfWeek = listOf("S", "M", "T", "W", "T", "F", "S")
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            daysOfWeek.forEach { day ->
                Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                    Text(day, color = Color.Gray, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Calendar Grid
        val daysInMonth = (1..30).toList()
        val emptyStartDays = 1 // Starts on Monday
        val gridItems = List(emptyStartDays) { "" } + daysInMonth.map { it.toString() }
        
        LazyVerticalGrid(
            columns = GridCells.Fixed(7),
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(gridItems) { dayStr ->
                Box(
                    modifier = Modifier.aspectRatio(1f),
                    contentAlignment = Alignment.Center
                ) {
                    if (dayStr.isNotEmpty()) {
                        val isToday = dayStr == "6"
                        val hasEvent = dayStr == "7" || dayStr == "9"
                        
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(if (isToday) Color(0xFF2CB5B3) else Color.Transparent),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = dayStr,
                                color = if (isToday) Color.White else Color.LightGray,
                                fontSize = 16.sp,
                                fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                        
                        if (hasEvent) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .padding(bottom = 2.dp)
                                    .size(4.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFE67E22))
                            )
                        }
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        Text("Agenda", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        Text("No events selected.", color = Color.Gray)
    }
}
