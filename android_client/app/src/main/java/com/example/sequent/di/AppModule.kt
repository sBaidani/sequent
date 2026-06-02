package com.example.sequent.di

import android.content.Context
import androidx.room.Room
import com.example.sequent.data.local.AppDatabase
import com.example.sequent.data.local.dao.EventDao
import com.example.sequent.data.local.dao.ListDao
import com.example.sequent.data.local.dao.TaskDao
import com.example.sequent.data.remote.SupabaseApiClient
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideSupabaseClient(): SupabaseClient {
        // Replace with actual keys via BuildConfig or similar in production
        return createSupabaseClient(
            supabaseUrl = "https://your-project.supabase.co",
            supabaseKey = "your-anon-key"
        ) {
            install(Auth)
        }
    }

    @Provides
    @Singleton
    fun provideSupabaseApiClient(supabaseClient: SupabaseClient): SupabaseApiClient {
        return SupabaseApiClient(supabaseClient)
    }

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "sequent_db"
        ).build()
    }

    @Provides
    fun provideTaskDao(db: AppDatabase): TaskDao = db.taskDao()

    @Provides
    fun provideEventDao(db: AppDatabase): EventDao = db.eventDao()

    @Provides
    fun provideListDao(db: AppDatabase): ListDao = db.listDao()
}
