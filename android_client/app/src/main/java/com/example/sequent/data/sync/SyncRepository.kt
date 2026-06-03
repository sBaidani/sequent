package com.example.sequent.data.sync

import android.content.Context
import com.example.sequent.data.local.dao.EventDao
import com.example.sequent.data.local.dao.TaskDao
import com.example.sequent.data.local.entities.EventEntity
import com.example.sequent.data.local.entities.TaskEntity
import com.example.sequent.data.remote.SupabaseApiClient
import com.example.sequent.data.remote.TaskDto
import com.example.sequent.notifications.NotificationHelper
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SyncRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val taskDao: TaskDao,
    private val eventDao: EventDao,
    private val apiClient: SupabaseApiClient
) {
    // Expose local flow for UI
    fun getAllTasks(): Flow<List<TaskEntity>> = taskDao.getAllTasks()
    fun getAllEvents(): Flow<List<EventEntity>> = eventDao.getAllEvents()

    // Create or update locally and mark as pending sync
    suspend fun saveTask(task: TaskEntity) {
        taskDao.insertTask(task.copy(isPendingSync = true))
    }

    // Delete locally and mark as pending sync
    suspend fun deleteTask(id: String, updatedAt: String) {
        taskDao.markAsDeleted(id, updatedAt)
    }

    suspend fun saveEvent(event: EventEntity) {
        eventDao.insertEvent(event.copy(isPendingSync = true))
        NotificationHelper.scheduleReminder(context, event.id, event.title, event.start_time)
    }

    // Perform a full sync with the remote server
    suspend fun syncTasks() {
        try {
            // 1. Push local changes
            val unsynced = taskDao.getUnsyncedTasks()
            for (task in unsynced) {
                if (task.isDeleted) {
                    apiClient.deleteTask(task.id)
                    taskDao.deletePermanently(task.id)
                } else {
                    val dto = task.toDto()
                    // Try to update; the server handles LWW based on updated_at
                    apiClient.updateTask(dto)
                    // Once successful, mark as synced
                    taskDao.insertTask(task.copy(isPendingSync = false))
                }
            }

            // 2. Pull remote changes
            val remoteTasks = apiClient.getTasks()
            for (remoteTask in remoteTasks) {
                val localTask = taskDao.getTaskById(remoteTask.id)
                if (localTask == null || isRemoteNewer(remoteTask, localTask)) {
                    taskDao.insertTask(remoteTask.toEntity())
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            // In a real app, handle exceptions and retry via WorkManager
        }
    }

    private fun isRemoteNewer(remote: TaskDto, local: TaskEntity): Boolean {
        // Simplified ISO 8601 string comparison for Last-Write-Wins
        val remoteTime = remote.updated_at ?: ""
        val localTime = local.updated_at
        return remoteTime > localTime
    }

    private fun TaskEntity.toDto() = TaskDto(
        id = id,
        title = title,
        description = description,
        listId = listId,
        completed = completed,
        scheduled_date = scheduled_date,
        created_at = created_at,
        updated_at = updated_at
    )

    private fun TaskDto.toEntity() = TaskEntity(
        id = id,
        title = title,
        description = description,
        listId = listId,
        completed = completed,
        scheduled_date = scheduled_date,
        created_at = created_at ?: "",
        updated_at = updated_at ?: "",
        isPendingSync = false,
        isDeleted = false
    )
}
