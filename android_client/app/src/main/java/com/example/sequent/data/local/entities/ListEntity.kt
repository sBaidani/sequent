package com.example.sequent.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Entity(tableName = "lists")
@Serializable
data class ListEntity(
    @PrimaryKey val id: String,
    val name: String,
    val color: String? = null,
    val icon: String? = null,
    val created_at: String,
    val updated_at: String,
    val isPendingSync: Boolean = false,
    val isDeleted: Boolean = false
)
