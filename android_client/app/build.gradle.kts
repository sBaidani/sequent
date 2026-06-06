plugins {
  alias(libs.plugins.android.application)
  alias(libs.plugins.compose.compiler)
  alias(libs.plugins.kotlin.serialization)
  alias(libs.plugins.hilt)
  alias(libs.plugins.ksp)
}

import java.util.Properties

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localProperties.load(localPropertiesFile.inputStream())
}

val supabaseUrlDev = localProperties.getProperty("supabase.url.dev") ?: "\"http://10.0.2.2:54321\""
val supabaseAnonKeyDev = localProperties.getProperty("supabase.anon.key.dev") ?: "\"\""
val supabaseUrlProd = localProperties.getProperty("supabase.url.prod") ?: "\"\""
val supabaseAnonKeyProd = localProperties.getProperty("supabase.anon.key.prod") ?: "\"\""

android {
    namespace = "com.example.sequent"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.example.sequent"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            buildConfigField("String", "SUPABASE_URL", supabaseUrlProd)
            buildConfigField("String", "SUPABASE_ANON_KEY", supabaseAnonKeyProd)
        }
        debug {
            buildConfigField("String", "SUPABASE_URL", supabaseUrlDev)
            buildConfigField("String", "SUPABASE_ANON_KEY", supabaseAnonKeyDev)
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
      compose = true
      aidl = false
      buildConfig = true
      shaders = false
    }

    packaging {
      resources {
        excludes += "/META-INF/{AL2.0,LGPL2.1}"
      }
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
  val composeBom = platform(libs.androidx.compose.bom)
  implementation(composeBom)
  androidTestImplementation(composeBom)

  // Core Android dependencies
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.lifecycle.runtime.ktx)
  implementation(libs.androidx.activity.compose)

  // Arch Components
  implementation(libs.androidx.lifecycle.runtime.compose)
  implementation(libs.androidx.lifecycle.viewmodel.compose)

  // Compose
  implementation(libs.androidx.compose.ui)
  implementation(libs.androidx.compose.material.icons.extended)
  implementation(libs.androidx.compose.ui.tooling.preview)
  implementation(libs.androidx.compose.material3)
  // Tooling
  debugImplementation(libs.androidx.compose.ui.tooling)
  // Instrumented tests
  androidTestImplementation(libs.androidx.compose.ui.test.junit4)
  debugImplementation(libs.androidx.compose.ui.test.manifest)

  // Local tests: jUnit, coroutines, Android runner
  testImplementation(libs.junit)
  testImplementation(libs.kotlinx.coroutines.test)

  // Instrumented tests: jUnit rules and runners
  androidTestImplementation(libs.androidx.test.core)
  androidTestImplementation(libs.androidx.test.ext.junit)
  androidTestImplementation(libs.androidx.test.runner)
  androidTestImplementation(libs.androidx.test.espresso.core)

  // Navigation
  implementation(libs.androidx.navigation3.runtime)
  implementation(libs.androidx.navigation3.ui)
  implementation(libs.androidx.lifecycle.viewmodel.navigation3)
  implementation(libs.navigation.compose)

  // Hilt
  implementation(libs.hilt.android)
  ksp(libs.hilt.compiler)

  // Supabase & Ktor
  implementation(platform(libs.supabase.bom))
  implementation(libs.supabase.postgrest)
  implementation(libs.supabase.auth)
  implementation(libs.ktor.client.android)
  implementation(libs.ktor.client.content.negotiation)
  implementation(libs.ktor.serialization.kotlinx.json)
  implementation(libs.kotlinx.serialization.json)

  // Room Database
  implementation(libs.room.runtime)
  implementation(libs.room.ktx)
  ksp(libs.room.compiler)

  // WorkManager & Hilt
  implementation(libs.work.runtime.ktx)
  implementation(libs.hilt.work)
  implementation(libs.hilt.navigation.compose)
  ksp(libs.androidx.hilt.compiler)

  // Glance
  implementation(libs.androidx.glance.appwidget)
}
