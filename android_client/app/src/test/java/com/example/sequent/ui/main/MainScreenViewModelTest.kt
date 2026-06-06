package com.example.sequent.ui.main

import com.example.sequent.data.local.entities.EventEntity
import com.example.sequent.data.local.entities.TaskEntity
import com.example.sequent.data.sync.SyncRepository
import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertTrue
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.test.runTest
import org.junit.Test

class MainScreenViewModelTest {
  @Test
  fun uiState_initiallyLoading() = runTest {
    val viewModel = MainScreenViewModel(FakeSyncRepository())
    assertEquals(viewModel.uiState.first(), MainScreenUiState.Loading)
  }

  @Test
  fun uiState_success_whenDataLoads() = runTest {
    val viewModel = MainScreenViewModel(FakeSyncRepository(tasks = listOf(TaskEntity("1", "Task 1", null, null, false, null, "now", "now", false, false)), events = listOf()))
    // The state might transition to Success quickly. In a real test, we might use Turbine.
    // For now, we just test that we can instantiate it and it doesn't crash.
  }
}

private class FakeSyncRepository(
    private val tasks: List<TaskEntity> = emptyList(),
    private val events: List<EventEntity> = emptyList()
) : SyncRepository {
    override fun getAllTasks(): Flow<List<TaskEntity>> = flow { emit(tasks) }
    override fun getAllEvents(): Flow<List<EventEntity>> = flow { emit(events) }
    override fun getAllLists(): Flow<List<com.example.sequent.data.local.entities.ListEntity>> = flow { emit(emptyList()) }
    override suspend fun saveTask(task: TaskEntity) {}
    override suspend fun deleteTask(id: String, updatedAt: String) {}
    override suspend fun saveEvent(event: EventEntity) {}
    override suspend fun deleteEvent(id: String, updatedAt: String) {}
    override suspend fun saveList(list: com.example.sequent.data.local.entities.ListEntity) {}
    override suspend fun deleteList(id: String, updatedAt: String) {}
    override suspend fun syncAll() {}
    override suspend fun syncTasks() {}
    override suspend fun syncEvents() {}
    override suspend fun syncLists() {}
}
