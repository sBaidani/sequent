package com.example.sequent.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.sequent.data.local.entities.EventEntity
import com.example.sequent.data.local.entities.TaskEntity
import com.example.sequent.data.sync.SyncRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class MainScreenViewModel @Inject constructor(
    private val syncRepository: SyncRepository
) : ViewModel() {
  val uiState: StateFlow<MainScreenUiState> = combine(
      syncRepository.getAllTasks(),
      syncRepository.getAllEvents()
  ) { tasks, events ->
      MainScreenUiState.Success(tasks, events) as MainScreenUiState
  }
      .catch { emit(MainScreenUiState.Error(it)) }
      .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), MainScreenUiState.Loading)
}

sealed interface MainScreenUiState {
  object Loading : MainScreenUiState

  data class Error(val throwable: Throwable) : MainScreenUiState

  data class Success(val tasks: List<TaskEntity>, val events: List<EventEntity>) : MainScreenUiState
}

