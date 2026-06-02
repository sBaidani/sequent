package com.example.sequent.data.remote

import kotlinx.serialization.Serializable

@Serializable
data class TaskDto(
    val id: String,
    val title: String,
    val description: String? = null,
    val listId: String? = null,
    val completed: Boolean = false,
    val scheduled_date: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null
)

@Serializable
data class EventDto(
    val id: String,
    val title: String,
    val description: String? = null,
    val calendarId: String? = null,
    val start_time: String,
    val end_time: String,
    val all_day: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null
)

@Serializable
data class ListDto(
    val id: String,
    val name: String,
    val color: String? = null,
    val icon: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null
)
