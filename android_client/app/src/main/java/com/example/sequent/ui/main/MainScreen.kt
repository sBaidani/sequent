package com.example.sequent.ui.main

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun MainScreen(viewModel: MainScreenViewModel = hiltViewModel()) {
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()

  Column(modifier = Modifier.padding(16.dp)) {
    when (val state = uiState) {
      is MainScreenUiState.Loading -> {
        Text(text = "Loading Tasks...")
      }
      is MainScreenUiState.Success -> {
        val tasks = state.data
        if (tasks.isEmpty()) {
          Text(text = "No Tasks available.")
        } else {
          Text(text = "Loaded ${tasks.size} tasks.")
          tasks.forEach { task ->
            Text(text = "- ${task.title}")
          }
        }
      }
      is MainScreenUiState.Error -> {
        Text(text = "Error: ${state.throwable.message}")
      }
    }
  }
}

