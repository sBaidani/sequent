package com.example.sequent.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.sequent.data.local.entities.EventEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface EventDao {
    @Query("SELECT * FROM events WHERE isDeleted = 0")
    fun getAllEvents(): Flow<List<EventEntity>>

    @Query("SELECT * FROM events WHERE isPendingSync = 1")
    @JvmSuppressWildcards
    suspend fun getUnsyncedEvents(): List<EventEntity>

    @Query("SELECT * FROM events WHERE id = :id")
    @JvmSuppressWildcards
    suspend fun getEventById(id: String): EventEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    @JvmSuppressWildcards
    suspend fun insertEvent(event: EventEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    @JvmSuppressWildcards
    suspend fun insertEvents(events: List<EventEntity>): List<Long>

    @Query("UPDATE events SET isDeleted = 1, isPendingSync = 1, updated_at = :updatedAt WHERE id = :id")
    @JvmSuppressWildcards
    suspend fun markAsDeleted(id: String, updatedAt: String): Int

    @Query("DELETE FROM events WHERE id = :id")
    @JvmSuppressWildcards
    suspend fun deletePermanently(id: String): Int
    
    @Query("DELETE FROM events")
    @JvmSuppressWildcards
    suspend fun deleteAll(): Int
}
