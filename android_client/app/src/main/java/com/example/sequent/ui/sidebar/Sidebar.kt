package com.example.sequent.ui.sidebar

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.sequent.NavDestination
import com.example.sequent.ui.main.MainScreenViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.sequent.ui.main.MainScreenUiState
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.YearMonth
import java.util.*
import kotlinx.coroutines.delay

@Composable
fun Sidebar(
    currentDestination: NavDestination,
    onNavigate: (NavDestination) -> Unit,
    onSignOut: () -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: MainScreenViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var currentTime by remember { mutableStateOf(Calendar.getInstance().time) }
    
    LaunchedEffect(Unit) {
        while(true) {
            currentTime = Calendar.getInstance().time
            delay(1000)
        }
    }
    
    val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    val dateFormat = SimpleDateFormat("EEEE, MMMM d", Locale.getDefault())

    ModalDrawerSheet(
        modifier = modifier.width(340.dp),
        drawerContainerColor = Color(0xFF0A0A0A) // Pitch black matching the screenshot
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 48.dp, start = 24.dp, end = 24.dp, bottom = 24.dp)
        ) {
            // Clock
            Text(
                text = timeFormat.format(currentTime),
                color = Color.White,
                fontSize = 42.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = (-1).sp
            )
            Text(
                text = dateFormat.format(currentTime).uppercase(),
                color = Color.Gray,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
            )

            // Planning Widget
            val state = uiState
            if (state is MainScreenUiState.Success && state.events.isNotEmpty()) {
                val nextEvent = state.events.first() // Assumes events are sorted by time
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .background(Color(0xFF142426)) // Dark teal container
                        .padding(2.dp) // Subtle glow border effect
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(18.dp))
                            .background(
                                brush = Brush.linearGradient(
                                    colors = listOf(Color(0xFF122A2B), Color(0xFF0F1B1C))
                                )
                            )
                            .padding(20.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(nextEvent.title, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                                val timeStr = nextEvent.start_time.substringAfter("T").take(5)
                                Text("at $timeStr", color = Color.Gray, fontSize = 12.sp)
                            }
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.WbSunny, contentDescription = "Weather", tint = Color(0xFFF6A820), modifier = Modifier.size(28.dp))
                            Text("72°", color = Color.Gray, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Mini Calendar
            val currentLocalDate = LocalDate.now()
            val yearMonth = YearMonth.now()
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.ChevronLeft, contentDescription = "Prev", tint = Color.Gray, modifier = Modifier.size(16.dp))
                val monthYearStr = "${currentLocalDate.month.name} ${currentLocalDate.year}"
                Text(monthYearStr, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
                Icon(Icons.Default.ChevronRight, contentDescription = "Next", tint = Color.Gray, modifier = Modifier.size(16.dp))
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Days Header
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                listOf("S", "M", "T", "W", "T", "F", "S").forEach { day ->
                    Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                        Text(day, color = Color.Gray, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))

            // Calendar Grid
            val daysInMonth = yearMonth.lengthOfMonth()
            val startOffset = yearMonth.atDay(1).dayOfWeek.value % 7 // 0 for Sunday
            val activeDays = if (state is MainScreenUiState.Success) {
                state.events.mapNotNull {
                    try {
                        LocalDate.parse(it.start_time.substringBefore("T")).dayOfMonth
                    } catch (e: Exception) { null }
                }.toSet()
            } else emptySet()
            
            Column(modifier = Modifier.fillMaxWidth()) {
                for (row in 0..5) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        for (col in 0..6) {
                            val index = row * 7 + col
                            val dayNum = index - startOffset + 1
                            val isCurrentMonth = dayNum in 1..daysInMonth
                            
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                                    .padding(2.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                if (isCurrentMonth) {
                                    val isSelected = activeDays.contains(dayNum)
                                    if (isSelected) {
                                        Box(
                                            modifier = Modifier
                                                .size(32.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFF2CB5B3))
                                        )
                                    }
                                    Text(
                                        text = dayNum.toString(),
                                        color = if (isSelected) Color.Black else Color.White,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Navigation Links
            SidebarItem("Timeline", Icons.Default.Schedule, currentDestination == NavDestination.Timeline) { onNavigate(NavDestination.Timeline) }
            SidebarItem("Calendar", Icons.Default.DateRange, currentDestination == NavDestination.Calendar) { onNavigate(NavDestination.Calendar) }
            SidebarItem("Tasks", Icons.Default.CheckCircle, currentDestination == NavDestination.Tasks) { onNavigate(NavDestination.Tasks) }
            SidebarItem("Archive", Icons.Default.Archive, currentDestination == NavDestination.Archive) { onNavigate(NavDestination.Archive) }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Footer
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 16.dp)) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF2CB5B3)), // Teal brand color
                    contentAlignment = Alignment.Center
                ) {
                    Text("S", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text("Sequent", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(Color(0xFF6DC43E))) // Green dot
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("CLOUD", color = Color.Gray, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF141414))
                    .clickable { onSignOut() },
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Logout, contentDescription = "Sign Out", tint = Color.Gray, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Sign Out", color = Color.Gray, fontSize = 14.sp)
                }
            }
        }
    }
}

@Composable
fun SidebarItem(
    title: String,
    icon: ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val backgroundColor = if (isSelected) Color(0xFF2CB5B3) else Color.Transparent
    val contentColor = if (isSelected) Color.White else Color.LightGray

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(backgroundColor)
            .clickable { onClick() }
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(imageVector = icon, contentDescription = title, tint = contentColor, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Text(text = title, color = contentColor, fontSize = 15.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal)
    }
    Spacer(modifier = Modifier.height(4.dp))
}
