package com.example.sequent.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.sequent.data.local.entities.ListEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ListDao {
    @Query("SELECT * FROM lists WHERE isDeleted = 0")
    fun getAllLists(): Flow<List<ListEntity>>

    @Query("SELECT * FROM lists WHERE isPendingSync = 1")
    @JvmSuppressWildcards
    suspend fun getUnsyncedLists(): List<ListEntity>

    @Query("SELECT * FROM lists WHERE id = :id")
    @JvmSuppressWildcards
    suspend fun getListById(id: String): ListEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    @JvmSuppressWildcards
    suspend fun insertList(list: ListEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    @JvmSuppressWildcards
    suspend fun insertLists(lists: List<ListEntity>): List<Long>

    @Query("UPDATE lists SET isDeleted = 1, isPendingSync = 1, updated_at = :updatedAt WHERE id = :id")
    @JvmSuppressWildcards
    suspend fun markAsDeleted(id: String, updatedAt: String): Int

    @Query("DELETE FROM lists WHERE id = :id")
    @JvmSuppressWildcards
    suspend fun deletePermanently(id: String): Int
    
    @Query("DELETE FROM lists")
    @JvmSuppressWildcards
    suspend fun deleteAll(): Int
}
