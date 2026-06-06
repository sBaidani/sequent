package com.example.sequent.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.sequent.data.local.entities.TaskEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TaskDao {
    @Query("SELECT * FROM tasks WHERE isDeleted = 0")
    fun getAllTasks(): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks WHERE isPendingSync = 1")
    @JvmSuppressWildcards
    suspend fun getUnsyncedTasks(): List<TaskEntity>

    @Query("SELECT * FROM tasks WHERE id = :id")
    @JvmSuppressWildcards
    suspend fun getTaskById(id: String): TaskEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    @JvmSuppressWildcards
    suspend fun insertTask(task: TaskEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    @JvmSuppressWildcards
    suspend fun insertTasks(tasks: List<TaskEntity>): List<Long>

    @Query("UPDATE tasks SET isDeleted = 1, isPendingSync = 1, updated_at = :updatedAt WHERE id = :id")
    @JvmSuppressWildcards
    suspend fun markAsDeleted(id: String, updatedAt: String): Int

    @Query("DELETE FROM tasks WHERE id = :id")
    @JvmSuppressWildcards
    suspend fun deletePermanently(id: String): Int
    
    @Query("DELETE FROM tasks")
    @JvmSuppressWildcards
    suspend fun deleteAll(): Int
}
