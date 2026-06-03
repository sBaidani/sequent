# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.kts.

# Keep Compose metadata
-keep class androidx.compose.** { *; }

# Keep Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembernames class kotlinx.** {
    volatile <fields>;
}

# Keep Ktor models
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <fields>;
}

# Keep Room entities
-keep class com.example.sequent.data.local.entities.** { *; }
