package com.example.sequent.ui.main

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.BottomAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MainScreen(
    onOpenDrawer: () -> Unit,
    viewModel: MainScreenViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val pagerState = rememberPagerState(pageCount = { 2 })

    HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
        when (page) {
            0 -> TimelineView(onOpenDrawer, uiState)
            1 -> ScheduleView()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimelineView(
    onOpenDrawer: () -> Unit,
    uiState: MainScreenUiState
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sequent Timeline", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Open Drawer")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF000000), // Pure black background
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        containerColor = Color.Black
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            when (val state = uiState) {
                is MainScreenUiState.Loading -> {
                    Text(text = "Loading Tasks...", color = Color.White, modifier = Modifier.padding(16.dp))
                }
                is MainScreenUiState.Success -> {
                    val events = state.events
                    
                    // Convert EventEntities to TimelineItems
                    val timelineItems = mutableListOf<TimelineItem>()
                    if (events.isEmpty()) {
                        timelineItems.add(TimelineItem.EmptyDay("Today", "No events"))
                    } else {
                        // Very basic grouping by date (assuming start_time is ISO 8601 string)
                        val groupedEvents = events.groupBy { it.start_time.substringBefore("T") }
                        for ((dateStr, dayEvents) in groupedEvents) {
                            val parts = dateStr.split("-")
                            val day = if (parts.size >= 3) parts[2] else "??"
                            val month = if (parts.size >= 2) parts[1] else "??"
                            
                            timelineItems.add(TimelineItem.DayStart(day, month, isToday = false)) // Simplified isToday
                            for (event in dayEvents) {
                                val timeStr = event.start_time.substringAfter("T").take(5) + " → " + event.end_time.substringAfter("T").take(5)
                                timelineItems.add(TimelineItem.Event(event.title, timeStr, Color(0xFF2980B9)))
                            }
                        }
                    }

                    LazyColumn(modifier = Modifier.fillMaxSize()) {
                        itemsIndexed(timelineItems) { index, item ->
                            when (item) {
                                is TimelineItem.DayStart -> {
                                    DayHeaderRow(item.day, item.month, item.isToday)
                                }
                                is TimelineItem.EmptyDay -> {
                                    EmptyDayRow(item.day, item.month)
                                }
                                is TimelineItem.Event -> {
                                    EventRow(item.title, item.time, item.color)
                                }
                            }
                        }
                    }
                }
                is MainScreenUiState.Error -> {
                    Text(text = "Error: ${state.throwable.message}", color = Color.Red, modifier = Modifier.padding(16.dp))
                }
            }
        }
    }
}

sealed class TimelineItem {
    data class DayStart(val day: String, val month: String, val isToday: Boolean) : TimelineItem()
    data class EmptyDay(val day: String, val month: String) : TimelineItem()
    data class Event(val title: String, val time: String, val color: Color) : TimelineItem()
}

@Composable
fun DayHeaderRow(day: String, month: String, isToday: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier.width(80.dp),
            contentAlignment = Alignment.Center
        ) {
            if (isToday) {
                Column(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.White)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(month, color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text(day, color = Color.Black, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                }
            } else {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(month, color = Color.Gray, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text(day, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        // Rest of the row is empty, events go below this, or maybe aligned?
        // In the screenshot, the event is aligned WITH the day header sometimes.
        // For simplicity, we make DayHeader its own row, and the event follows immediately.
    }
}

@Composable
fun EmptyDayRow(day: String, month: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(modifier = Modifier.width(80.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(month, color = Color.Gray, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Text(day, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun EventRow(title: String, time: String, color: Color) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Spacer(modifier = Modifier.width(80.dp)) // Left axis indent
        Box(
            modifier = Modifier
                .width(4.dp)
                .height(32.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(color)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.W500)
            Text(time, color = Color.Gray, fontSize = 12.sp)
        }
    }
}

@Composable
fun ScheduleView() {
    Scaffold(
        containerColor = Color(0xFF8B5A76), // Mauve background from screenshot
        bottomBar = {
            BottomAppBar(
                containerColor = Color(0x33000000), // Semi-transparent black
                contentColor = Color.White,
                modifier = Modifier.clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    IconButton(onClick = { /* TODO */ }) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") }
                    IconButton(onClick = { /* TODO */ }) { Icon(Icons.Default.FilterList, contentDescription = "Filter") }
                    IconButton(onClick = { /* TODO */ }) { Icon(Icons.Default.Schedule, contentDescription = "Schedule") }
                    IconButton(onClick = { /* TODO */ }) { Icon(Icons.Default.Add, contentDescription = "Add") }
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(modifier = Modifier.height(48.dp))
            Text("SUNDAY", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold)
            Text("11 JUNE", color = Color.LightGray, fontSize = 16.sp)
            
            Spacer(modifier = Modifier.height(32.dp))
            
            ScheduleSection("SCHEDULE") {
                ScheduleCard("Dinner with Priya", "6:30 PM → 7:30 PM", Color(0xFFE67E22))
            }
            
            ScheduleSection("WEATHER") {
                GlassCard {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(16.dp)) {
                        Icon(Icons.Default.WbSunny, contentDescription = "Sun", tint = Color.White, modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text("14°", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                            Text("96% humidity and light wind in Kingston with no rain", color = Color.White, fontSize = 14.sp)
                        }
                    }
                }
            }
            
            ScheduleSection("ON THIS DAY") {
                GlassCard {
                    Text(
                        "1770 Captain Cook discovers the Great Barrier Reef when his ship runs aground.",
                        color = Color.White,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
            
            ScheduleSection("ACTIONS") {
                ActionCard("Get new bicycle tyre \uD83D\uDEB2")
                Spacer(modifier = Modifier.height(8.dp))
                ActionCard("Buy cheeses \uD83E\uDDC0")
            }
            
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun ScheduleSection(title: String, content: @Composable () -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
        Text(title, color = Color.LightGray, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
        Spacer(modifier = Modifier.height(12.dp))
        content()
    }
}

@Composable
fun GlassCard(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0x33FFFFFF)) // Glassmorphism white overlay
    ) {
        content()
    }
}

@Composable
fun ScheduleCard(title: String, time: String, color: Color) {
    GlassCard {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(32.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(color)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.W500)
                Text(time, color = Color.LightGray, fontSize = 14.sp)
            }
        }
    }
}

@Composable
fun ActionCard(title: String) {
    GlassCard {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color.White) // Mock Checkbox
            )
            Spacer(modifier = Modifier.width(16.dp))
            Text(title, color = Color.White, fontSize = 16.sp)
        }
    }
}
