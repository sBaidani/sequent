package com.example.sequent.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.sequent.data.local.entities.EventEntity
import com.example.sequent.ui.event.ViewEventModal
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    onOpenDrawer: () -> Unit,
    onAddEventClick: () -> Unit,
    viewModel: MainScreenViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var selectedEvent by remember { mutableStateOf<EventEntity?>(null) }
    
    if (selectedEvent != null) {
        ViewEventModal(
            event = selectedEvent!!,
            onDismissRequest = { selectedEvent = null }
        )
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddEventClick,
                containerColor = Color(0xFF9E7EED),
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Event")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF0F0F5)) // Very light gray/purple tint background
        ) {
            // Header Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 48.dp, start = 24.dp, end = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onOpenDrawer) {
                    Icon(Icons.Default.Menu, contentDescription = "Menu", tint = Color.Black)
                }
                Box(modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.Gray)) {
                    // User Avatar placeholder
                }
            }

            // Month Title
            val currentDate = LocalDate.now()
            val monthName = currentDate.month.getDisplayName(TextStyle.FULL, Locale.getDefault())
            Row(
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(monthName, fontSize = 36.sp, fontWeight = FontWeight.Medium, color = Color.Black)
                Spacer(modifier = Modifier.width(8.dp))
                Icon(Icons.Default.KeyboardArrowDown, contentDescription = "Month", tint = Color.DarkGray)
            }

            // Week Selector
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color(0xFF2B2B2B))
                    .padding(horizontal = 16.dp, vertical = 20.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    val days = (0..5).map { currentDate.minusDays(currentDate.dayOfWeek.value.toLong() % 7 - it) }
                    days.forEach { date ->
                        val dayStr = date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault())
                        val dayNum = date.dayOfMonth.toString()
                        val isSelected = date == currentDate
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (isSelected) Color(0xFFBB99FF) else Color.Transparent)
                                .padding(vertical = 12.dp, horizontal = 8.dp)
                        ) {
                            Text(dayStr, color = if (isSelected) Color.Black else Color.Gray, fontSize = 12.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(dayNum, color = if (isSelected) Color.Black else Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Timeline List
            when (val state = uiState) {
                is MainScreenUiState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF9E7EED))
                    }
                }
                is MainScreenUiState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Error loading events", color = Color.Red)
                    }
                }
                is MainScreenUiState.Success -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(state.events) { event ->
                            EventCard(event = event, onClick = { selectedEvent = event })
                        }
                        if (state.events.isEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("No events scheduled", color = Color.Gray)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun EventCard(event: EventEntity, onClick: () -> Unit = {}) {
    val isPurple = event.id.hashCode() % 2 == 0 // Alternating logic for simulation
    
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(32.dp))
            .background(if (isPurple) Color(0xFFAC88ED) else Color(0xFFE8E8E8))
            .padding(24.dp)
            .clickable(onClick = onClick)
    ) {
        Column {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Row {
                    Box(modifier = Modifier.size(32.dp).clip(CircleShape).background(Color.LightGray))
                }
                Box(modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(Color.White).padding(horizontal = 12.dp, vertical = 6.dp)) {
                    val timeStr = event.start_time.substringAfter("T").take(5)
                    Text(timeStr, color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(event.title, color = Color.Black, fontSize = 24.sp, fontWeight = FontWeight.Medium)
            if (event.description?.isNotBlank() == true) {
                Text(event.description, color = Color.DarkGray, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}
