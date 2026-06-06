package com.example.sequent.ui.tasks

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.sequent.data.local.entities.TaskEntity
import com.example.sequent.ui.main.MainScreenUiState
import com.example.sequent.ui.main.MainScreenViewModel
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

@Composable
fun TasksScreen(
    onAddTaskClick: () -> Unit,
    viewModel: MainScreenViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddTaskClick,
                containerColor = Color(0xFFD94D31),
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Task")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFF141414)) // Dark background like the screenshot border
        ) {
        // Orange Header
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp))
                .background(Color(0xFFD94D31)) // Orange color
                .padding(top = 48.dp, bottom = 24.dp, start = 24.dp, end = 24.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Menu, contentDescription = "Menu", tint = Color.White)
                    Box(modifier = Modifier.size(36.dp).clip(CircleShape).background(Color.White)) {
                        // User Avatar placeholder
                    }
                }
                
                Spacer(modifier = Modifier.height(32.dp))
                
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val currentDate = LocalDate.now()
                    val monthName = currentDate.month.getDisplayName(TextStyle.FULL, Locale.getDefault())
                    Text(monthName, color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(Icons.Default.KeyboardArrowDown, contentDescription = "Month", tint = Color.White)
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Mini Calendar Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    val currentDate = LocalDate.now()
                    val days = (0..6).map { currentDate.minusDays(currentDate.dayOfWeek.value.toLong() % 7 - it) }
                    days.forEach { date ->
                        val dayStr = date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault())
                        val dayNum = date.dayOfMonth.toString()
                        val isSelected = date == currentDate
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (isSelected) Color.White else Color.Transparent)
                                .padding(vertical = 12.dp, horizontal = 8.dp)
                        ) {
                            Text(dayStr, color = if (isSelected) Color.Black else Color.White, fontSize = 12.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(dayNum, color = if (isSelected) Color.Black else Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Tasks List
        when (val state = uiState) {
            is MainScreenUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFFD94D31))
                }
            }
            is MainScreenUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Error loading tasks", color = Color.Red)
                }
            }
            is MainScreenUiState.Success -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(top = 16.dp),
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(state.tasks) { task ->
                        TaskCard(task)
                    }
                    if (state.tasks.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("No tasks for today", color = Color.Gray)
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
fun TaskCard(task: TaskEntity) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(Color.White)
            .padding(24.dp)
    ) {
        Column {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("12:00-1:00 PM", color = Color.Gray, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                // Avatars placeholder
                Row {
                    Box(modifier = Modifier.size(24.dp).clip(CircleShape).background(Color.LightGray))
                    Spacer(modifier = Modifier.width(4.dp))
                    Box(modifier = Modifier.size(24.dp).clip(CircleShape).background(Color.Gray))
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(task.title, color = Color.Black, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            if (task.description?.isNotBlank() == true) {
                Text(task.description, color = Color.DarkGray, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
            }
            Spacer(modifier = Modifier.height(24.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row {
                    Box(modifier = Modifier.clip(RoundedCornerShape(24.dp)).background(Color(0xFFF0F0F0)).padding(horizontal = 16.dp, vertical = 8.dp)) {
                        Text("Today", color = Color.Gray, fontSize = 14.sp)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(modifier = Modifier.clip(RoundedCornerShape(24.dp)).background(Color(0xFFF0F0F0)).padding(horizontal = 16.dp, vertical = 8.dp)) {
                        Text("1 h", color = Color.Gray, fontSize = 14.sp)
                    }
                }
                Box(modifier = Modifier.size(48.dp).clip(CircleShape).background(Color.Black), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.ArrowForward, contentDescription = "Open", tint = Color.White)
                }
            }
        }
    }
}
