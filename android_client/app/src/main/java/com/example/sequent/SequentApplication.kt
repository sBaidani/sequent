package com.example.sequent

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class SequentApplication : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}
