package com.example.sequent.ui.main

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
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
                title = { Text("Timeline") },
                navigationIcon = {
                    IconButton(onClick = onOpenDrawer) {
                        Icon(Icons.Default.Menu, contentDescription = "Open Drawer")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0F0F0F),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        containerColor = Color.Black
    ) { padding ->
        Column(modifier = Modifier.padding(padding).padding(16.dp)) {
            when (val state = uiState) {
                is MainScreenUiState.Loading -> {
                    Text(text = "Loading Tasks...", color = Color.White)
                }
                is MainScreenUiState.Success -> {
                    val tasks = state.data
                    if (tasks.isEmpty()) {
                        Text(text = "No Tasks available.", color = Color.White)
                    } else {
                        Text(text = "Loaded ${tasks.size} tasks.", color = Color.White)
                        tasks.forEach { task ->
                            Text(text = "- ${task.title}", color = Color.LightGray)
                        }
                    }
                }
                is MainScreenUiState.Error -> {
                    Text(text = "Error: ${state.throwable.message}", color = Color.Red)
                }
            }
        }
    }
}

@Composable
fun ScheduleView() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF8B5A76)), // Mauve background from screenshot
        contentAlignment = Alignment.Center
    ) {
        Text("Schedule View Placeholder", color = Color.White)
    }
}
