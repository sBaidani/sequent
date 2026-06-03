package com.example.sequent.ui.sidebar

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.sequent.NavDestination

@Composable
fun Sidebar(
    currentDestination: NavDestination,
    onNavigate: (NavDestination) -> Unit,
    modifier: Modifier = Modifier
) {
    ModalDrawerSheet(
        modifier = modifier.width(320.dp),
        drawerContainerColor = Color(0xFF0F0F0F) // Deep dark background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
        ) {
            // Header
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF2CB5B3)), // Teal brand color
                    contentAlignment = Alignment.Center
                ) {
                    Text("S", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column {
                    Text("Sequent", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Color(0xFF6DC43E))) // Green dot
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("CLOUD", color = Color.Gray, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Mini Calendar Placeholder
            Text("JUNE 2026", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.CenterHorizontally))
            Spacer(modifier = Modifier.height(16.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .background(Color(0xFF1A1A1A), RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text("Mini Calendar Grid Here", color = Color.Gray)
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Navigation Links
            SidebarItem("Timeline", Icons.Default.Schedule, currentDestination == NavDestination.Timeline) { onNavigate(NavDestination.Timeline) }
            SidebarItem("Calendar", Icons.Default.DateRange, currentDestination == NavDestination.Calendar) { onNavigate(NavDestination.Calendar) }
            SidebarItem("Tasks", Icons.Default.CheckCircle, currentDestination == NavDestination.Tasks) { onNavigate(NavDestination.Tasks) }
            SidebarItem("Archive", Icons.Default.Archive, currentDestination == NavDestination.Archive) { onNavigate(NavDestination.Archive) }
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
            .height(56.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(backgroundColor)
            .clickable { onClick() }
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(imageVector = icon, contentDescription = title, tint = contentColor, modifier = Modifier.size(24.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Text(text = title, color = contentColor, fontSize = 16.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal)
    }
    Spacer(modifier = Modifier.height(8.dp))
}
