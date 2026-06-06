package com.example.sequent.data.sync

import android.content.Context
import com.example.sequent.data.local.dao.EventDao
import com.example.sequent.data.local.dao.TaskDao
import com.example.sequent.data.local.entities.EventEntity
import com.example.sequent.data.local.entities.TaskEntity
import com.example.sequent.data.remote.SupabaseApiClient
import com.example.sequent.data.remote.TaskDto
import com.example.sequent.notifications.NotificationHelper
import com.example.sequent.data.local.dao.ListDao
import com.example.sequent.data.local.entities.ListEntity
import com.example.sequent.data.remote.EventDto
import com.example.sequent.data.remote.ListDto
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

interface SyncRepository {
    fun getAllTasks(): Flow<List<TaskEntity>>
    fun getAllEvents(): Flow<List<EventEntity>>
    fun getAllLists(): Flow<List<ListEntity>>
    suspend fun saveTask(task: TaskEntity)
    suspend fun deleteTask(id: String, updatedAt: String)
    suspend fun saveEvent(event: EventEntity)
    suspend fun deleteEvent(id: String, updatedAt: String)
    suspend fun saveList(list: ListEntity)
    suspend fun deleteList(id: String, updatedAt: String)
    suspend fun syncAll()
    suspend fun syncTasks()
    suspend fun syncEvents()
    suspend fun syncLists()
}

@Singleton
class SyncRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val taskDao: TaskDao,
    private val eventDao: EventDao,
    private val listDao: ListDao,
    private val apiClient: SupabaseApiClient
) : SyncRepository {
    // Expose local flow for UI
    override fun getAllTasks(): Flow<List<TaskEntity>> = taskDao.getAllTasks()
    override fun getAllEvents(): Flow<List<EventEntity>> = eventDao.getAllEvents()
    override fun getAllLists(): Flow<List<ListEntity>> = listDao.getAllLists()

    // Create or update locally and mark as pending sync
    override suspend fun saveTask(task: TaskEntity) {
        taskDao.insertTask(task.copy(isPendingSync = true))
    }

    // Delete locally and mark as pending sync
    override suspend fun deleteTask(id: String, updatedAt: String) {
        taskDao.markAsDeleted(id, updatedAt)
    }

    override suspend fun saveEvent(event: EventEntity) {
        eventDao.insertEvent(event.copy(isPendingSync = true))
        NotificationHelper.scheduleReminder(context, event.id, event.title, event.start_time)
    }

    override suspend fun deleteEvent(id: String, updatedAt: String) {
        eventDao.markAsDeleted(id, updatedAt)
    }

    override suspend fun saveList(list: ListEntity) {
        listDao.insertList(list.copy(isPendingSync = true))
    }

    override suspend fun deleteList(id: String, updatedAt: String) {
        listDao.markAsDeleted(id, updatedAt)
    }

    override suspend fun syncAll() {
        syncLists()
        syncTasks()
        syncEvents()
    }

    // Perform a full sync with the remote server
    override suspend fun syncTasks() {
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
        }
    }

    override suspend fun syncEvents() {
        try {
            val unsynced = eventDao.getUnsyncedEvents()
            for (event in unsynced) {
                if (event.isDeleted) {
                    apiClient.deleteEvent(event.id)
                    eventDao.deletePermanently(event.id)
                } else {
                    apiClient.updateEvent(event.toDto())
                    eventDao.insertEvent(event.copy(isPendingSync = false))
                }
            }
            val remoteEvents = apiClient.getEvents()
            for (remoteEvent in remoteEvents) {
                val localEvent = eventDao.getEventById(remoteEvent.id)
                if (localEvent == null || isRemoteNewer(remoteEvent, localEvent)) {
                    eventDao.insertEvent(remoteEvent.toEntity())
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override suspend fun syncLists() {
        try {
            val unsynced = listDao.getUnsyncedLists()
            for (list in unsynced) {
                if (list.isDeleted) {
                    apiClient.deleteList(list.id)
                    listDao.deletePermanently(list.id)
                } else {
                    apiClient.updateList(list.toDto())
                    listDao.insertList(list.copy(isPendingSync = false))
                }
            }
            val remoteLists = apiClient.getLists()
            for (remoteList in remoteLists) {
                val localList = listDao.getListById(remoteList.id)
                if (localList == null || isRemoteNewer(remoteList, localList)) {
                    listDao.insertList(remoteList.toEntity())
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun isRemoteNewer(remote: TaskDto, local: TaskEntity): Boolean {
        val remoteTime = remote.updated_at ?: ""
        return remoteTime > local.updated_at
    }

    private fun isRemoteNewer(remote: EventDto, local: EventEntity): Boolean {
        val remoteTime = remote.updated_at ?: ""
        return remoteTime > local.updated_at
    }

    private fun isRemoteNewer(remote: ListDto, local: ListEntity): Boolean {
        val remoteTime = remote.updated_at ?: ""
        return remoteTime > local.updated_at
    }

    private fun TaskEntity.toDto() = TaskDto(
        id = id,
        title = title,
        notes = description,
        listId = listId,
        completed = completed,
        priority = "normal",
        scheduled_date = scheduled_date,
        created_at = created_at,
        updated_at = updated_at
    )

    private fun TaskDto.toEntity() = TaskEntity(
        id = id,
        title = title,
        description = notes,
        listId = listId,
        completed = completed,
        scheduled_date = scheduled_date,
        created_at = created_at ?: "",
        updated_at = updated_at ?: "",
        isPendingSync = false,
        isDeleted = false
    )

    private fun EventEntity.toDto() = EventDto(
        id = id,
        title = title,
        notes = description,
        calendarId = calendarId,
        location = null,
        start_time = start_time,
        end_time = end_time,
        allDay = all_day,
        created_at = created_at,
        updated_at = updated_at
    )

    private fun EventDto.toEntity() = EventEntity(
        id = id,
        title = title,
        description = notes,
        calendarId = calendarId,
        start_time = start_time,
        end_time = end_time,
        all_day = allDay,
        created_at = created_at ?: "",
        updated_at = updated_at ?: "",
        isPendingSync = false,
        isDeleted = false
    )

    private fun com.example.sequent.data.local.entities.ListEntity.toDto() = com.example.sequent.data.remote.ListDto(
        id = id,
        name = name,
        color = color,
        icon = icon,
        created_at = created_at,
        updated_at = updated_at
    )

    private fun com.example.sequent.data.remote.ListDto.toEntity() = com.example.sequent.data.local.entities.ListEntity(
        id = id,
        name = name,
        color = color,
        icon = icon,
        created_at = created_at ?: "",
        updated_at = updated_at ?: "",
        isPendingSync = false,
        isDeleted = false
    )
}
