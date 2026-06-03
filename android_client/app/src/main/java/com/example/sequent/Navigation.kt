package com.example.sequent

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.sequent.ui.archive.ArchiveScreen
import com.example.sequent.ui.calendar.CalendarScreen
import com.example.sequent.ui.main.MainScreen
import com.example.sequent.ui.sidebar.Sidebar
import com.example.sequent.ui.tasks.TasksScreen
import kotlinx.coroutines.launch

enum class NavDestination(val route: String) {
    Timeline("timeline"),
    Calendar("calendar"),
    Tasks("tasks"),
    Archive("archive")
}

@Composable
fun MainNavigation() {
    val navController = rememberNavController()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val currentDestination = NavDestination.values().find { it.route == currentRoute } ?: NavDestination.Timeline

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            Sidebar(
                currentDestination = currentDestination,
                onNavigate = { destination ->
                    scope.launch { drawerState.close() }
                    if (currentDestination != destination) {
                        navController.navigate(destination.route) {
                            popUpTo(NavDestination.Timeline.route) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                }
            )
        }
    ) {
        NavHost(
            navController = navController,
            startDestination = NavDestination.Timeline.route,
            modifier = Modifier.fillMaxSize(),
            enterTransition = {
                slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Left, animationSpec = tween(300))
            },
            exitTransition = {
                slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Left, animationSpec = tween(300))
            },
            popEnterTransition = {
                slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Right, animationSpec = tween(300))
            },
            popExitTransition = {
                slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Right, animationSpec = tween(300))
            }
        ) {
            composable(NavDestination.Timeline.route) {
                MainScreen(onOpenDrawer = { scope.launch { drawerState.open() } })
            }
            composable(NavDestination.Calendar.route) {
                CalendarScreen()
            }
            composable(NavDestination.Tasks.route) {
                TasksScreen()
            }
            composable(NavDestination.Archive.route) {
                ArchiveScreen()
            }
        }
    }
}
