package com.example.sequent.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Entity(tableName = "events")
@Serializable
data class EventEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String? = null,
    val calendarId: String? = null,
    val start_time: String,
    val end_time: String,
    val all_day: Boolean = false,
    val created_at: String,
    val updated_at: String,
    val isPendingSync: Boolean = false,
    val isDeleted: Boolean = false
)
