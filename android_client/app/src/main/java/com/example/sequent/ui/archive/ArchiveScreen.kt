package com.example.sequent.ui.archive

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Restore
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

@Composable
fun ArchiveScreen(
    viewModel: MainScreenViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0A0A))
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 48.dp, start = 24.dp, end = 24.dp, bottom = 24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Archive, contentDescription = "Archive", tint = Color(0xFF38B2AC), modifier = Modifier.size(32.dp))
            Spacer(modifier = Modifier.width(16.dp))
            Text("Archive", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold)
        }

        // List
        when (val state = uiState) {
            is MainScreenUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF38B2AC))
                }
            }
            is MainScreenUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Error loading archive", color = Color.Red)
                }
            }
            is MainScreenUiState.Success -> {
                // Filter out tasks that are not done (for archive simulation)
                val archivedTasks = state.tasks // In a real app, filter by status
                
                if (archivedTasks.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Archive, contentDescription = "Empty", tint = Color.DarkGray, modifier = Modifier.size(64.dp))
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("No archived items", color = Color.Gray, fontSize = 16.sp)
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(archivedTasks) { task ->
                            ArchivedItemCard(task)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ArchivedItemCard(task: TaskEntity) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFF141414))
            .padding(20.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(task.title, color = Color.Gray, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                if (task.description?.isNotBlank() == true) {
                    Text(task.description, color = Color.DarkGray, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            IconButton(onClick = { /* Restore */ }) {
                Icon(Icons.Default.Restore, contentDescription = "Restore", tint = Color.Gray)
            }
        }
    }
}
