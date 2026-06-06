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
import com.example.sequent.ui.event.AddEventScreen
import com.example.sequent.ui.main.MainScreen
import com.example.sequent.ui.sidebar.Sidebar
import com.example.sequent.ui.tasks.AddTaskScreen
import com.example.sequent.ui.tasks.TasksScreen
import com.example.sequent.ui.auth.AuthViewModel
import kotlinx.coroutines.launch

enum class NavDestination(val route: String) {
    Timeline("timeline"),
    Calendar("calendar"),
    Tasks("tasks"),
    Archive("archive"),
    AddEvent("add_event"),
    AddTask("add_task")
}

@Composable
fun MainNavigation(
    authViewModel: AuthViewModel = androidx.hilt.navigation.compose.hiltViewModel()
) {
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
                },
                onSignOut = {
                    scope.launch {
                        drawerState.close()
                        authViewModel.signOut()
                        navController.navigate("auth") {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                }
            )
        }
    ) {
        NavHost(
            navController = navController,
            startDestination = "auth",
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
            composable("auth") {
                com.example.sequent.ui.auth.AuthScreen(
                    onAuthSuccess = {
                        navController.navigate(NavDestination.Timeline.route) {
                            popUpTo("auth") { inclusive = true }
                        }
                    }
                )
            }
            composable(NavDestination.Timeline.route) {
                MainScreen(
                    onOpenDrawer = { scope.launch { drawerState.open() } },
                    onAddEventClick = { navController.navigate(NavDestination.AddEvent.route) }
                )
            }
            composable(NavDestination.Calendar.route) {
                CalendarScreen()
            }
            composable(NavDestination.Tasks.route) {
                TasksScreen(
                    onAddTaskClick = { navController.navigate(NavDestination.AddTask.route) }
                )
            }
            composable(NavDestination.Archive.route) {
                ArchiveScreen()
            }
            composable(NavDestination.AddEvent.route) {
                AddEventScreen(onBack = { navController.popBackStack() })
            }
            composable(NavDestination.AddTask.route) {
                AddTaskScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
