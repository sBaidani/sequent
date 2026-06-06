package com.example.sequent.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Entity(tableName = "tasks")
@Serializable
data class TaskEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String? = null,
    val listId: String? = null,
    val completed: Boolean = false,
    val scheduled_date: String? = null,
    val created_at: String,
    val updated_at: String,
    val isPendingSync: Boolean = false,
    val isDeleted: Boolean = false
)
