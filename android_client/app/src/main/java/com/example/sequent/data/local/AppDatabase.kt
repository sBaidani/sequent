package com.example.sequent.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.sequent.data.local.dao.EventDao
import com.example.sequent.data.local.dao.ListDao
import com.example.sequent.data.local.dao.TaskDao
import com.example.sequent.data.local.entities.EventEntity
import com.example.sequent.data.local.entities.ListEntity
import com.example.sequent.data.local.entities.TaskEntity

@Database(
    entities = [
        TaskEntity::class,
        EventEntity::class,
        ListEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun taskDao(): TaskDao
    abstract fun eventDao(): EventDao
    abstract fun listDao(): ListDao
}
