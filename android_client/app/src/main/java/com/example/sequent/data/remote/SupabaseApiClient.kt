package com.example.sequent.data.remote

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SupabaseApiClient @Inject constructor(
    private val supabaseClient: SupabaseClient
) {
    private val httpClient = HttpClient(Android) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                encodeDefaults = true
            })
        }
        defaultRequest {
            contentType(ContentType.Application.Json)
        }
    }

    private fun getBaseUrl(endpoint: String): String {
        return "${supabaseClient.supabaseUrl}/functions/v1/$endpoint"
    }

    private suspend fun getAuthHeader(): String {
        val session = supabaseClient.auth.currentSessionOrNull()
        return "Bearer ${session?.accessToken ?: ""}"
    }

    // --- Tasks ---
    suspend fun getTasks(): List<TaskDto> {
        return httpClient.get(getBaseUrl("tasks")) {
            header("Authorization", getAuthHeader())
        }.body()
    }

    suspend fun upsertTask(task: TaskDto) {
        httpClient.post(getBaseUrl("tasks")) {
            header("Authorization", getAuthHeader())
            setBody(task)
        }
    }
    
    suspend fun updateTask(task: TaskDto) {
        httpClient.patch(getBaseUrl("tasks")) {
            header("Authorization", getAuthHeader())
            setBody(task)
        }
    }

    suspend fun deleteTask(id: String) {
        httpClient.delete(getBaseUrl("tasks")) {
            header("Authorization", getAuthHeader())
            url { parameters.append("id", id) }
        }
    }

    // --- Events ---
    suspend fun getEvents(): List<EventDto> {
        return httpClient.get(getBaseUrl("events")) {
            header("Authorization", getAuthHeader())
        }.body()
    }

    suspend fun upsertEvent(event: EventDto) {
        httpClient.post(getBaseUrl("events")) {
            header("Authorization", getAuthHeader())
            setBody(event)
        }
    }
    
    suspend fun updateEvent(event: EventDto) {
        httpClient.patch(getBaseUrl("events")) {
            header("Authorization", getAuthHeader())
            setBody(event)
        }
    }

    suspend fun deleteEvent(id: String) {
        httpClient.delete(getBaseUrl("events")) {
            header("Authorization", getAuthHeader())
            url { parameters.append("id", id) }
        }
    }

    // --- Lists ---
    suspend fun getLists(): List<ListDto> {
        return httpClient.get(getBaseUrl("lists")) {
            header("Authorization", getAuthHeader())
        }.body()
    }

    suspend fun upsertList(list: ListDto) {
        httpClient.post(getBaseUrl("lists")) {
            header("Authorization", getAuthHeader())
            setBody(list)
        }
    }
    
    suspend fun updateList(list: ListDto) {
        httpClient.patch(getBaseUrl("lists")) {
            header("Authorization", getAuthHeader())
            setBody(list)
        }
    }

    suspend fun deleteList(id: String) {
        httpClient.delete(getBaseUrl("lists")) {
            header("Authorization", getAuthHeader())
            url { parameters.append("id", id) }
        }
    }
}
