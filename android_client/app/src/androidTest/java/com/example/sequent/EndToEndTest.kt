package com.example.sequent

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Rule
import org.junit.Test

class EndToEndTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun app_launches_and_shows_auth_screen() {
        composeTestRule.setContent {
            MainNavigation()
        }

        // Verify we are on the auth screen initially
        composeTestRule.onNodeWithText("Sign in to continue").assertExists()
    }
}
