// App.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { BlurView } from 'expo-blur';

// Import custom Icon component
import { iconsMap } from './src/components/icons';
import { Icon } from './src/components/Icon';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from './src/components/layout';
import { BRAND } from './src/components/theme';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';

// Import Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import StudentDashboardScreen from './src/screens/student/DashboardScreen';
import StudentNotesScreen from './src/screens/student/NotesScreen';
import StudentMarksScreen from './src/screens/student/MarksScreen';
import StudentProfileScreen from './src/screens/student/ProfileScreen';
import CalendarScreen from './src/screens/student/CalendarScreen';
import StudentAttendanceScreen from './src/screens/student/AttendanceScreen';

// Parent Screens
import ParentDashboardScreen from './src/screens/parent/DashboardScreen';
import ParentChildrenScreen from './src/screens/parent/ChildrenScreen';
import ParentMarksScreen from './src/screens/parent/MarksScreen';
import ParentProfileScreen from './src/screens/parent/ProfileScreen';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const StudentTab = createBottomTabNavigator();
const ParentTab = createBottomTabNavigator();

// ═══════════════════════════════════════════════════════════════════════════
// FLOATING GLASSMORPHISM TAB BAR BACKGROUND
// ═══════════════════════════════════════════════════════════════════════════
const GlassTabBar: React.FC = () => (
  <View style={glassStyles.wrapper} pointerEvents="none">
    {Platform.OS === 'ios' ? (
      <BlurView
        intensity={60}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
    ) : (
      // Android: simulate with semi-transparent dark layer
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND.glassBg }]} />
    )}
    {/* Inner top highlight */}
    <View style={glassStyles.innerHighlight} />
    {/* Coloured accent line along the top */}
    <View style={glassStyles.accentBar}>
      <View style={[glassStyles.accentSegment, { backgroundColor: BRAND.red,    flex: 3 }]} />
      <View style={[glassStyles.accentSegment, { backgroundColor: BRAND.yellow, flex: 1 }]} />
      <View style={[glassStyles.accentSegment, { backgroundColor: BRAND.teal,   flex: 1 }]} />
      <View style={[glassStyles.accentSegment, { backgroundColor: BRAND.blue,   flex: 1 }]} />
    </View>
  </View>
);

const glassStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BRAND.glassBorder,
    // Outer glow / shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 24,
  },
  innerHighlight: {
    position: 'absolute',
    top: 0, left: 16, right: 16,
    height: 1,
    backgroundColor: BRAND.glassInnerHighlight,
    borderRadius: 1,
  },
  accentBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    flexDirection: 'row',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  accentSegment: {
    height: '100%',
  },
});

// ─── Shared tab screen options factory ──────────────────────────────────────
const buildTabScreenOptions = (activeColor: string) => ({
  tabBarActiveTintColor: activeColor,
  tabBarInactiveTintColor: 'rgba(255,255,255,0.38)',
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  tabBarIconStyle: { marginTop: 4 },
  tabBarStyle: {
    // Float above the screen
    position: 'absolute' as const,
    bottom: TAB_BAR_BOTTOM_OFFSET,
    left: 20,
    right: 20,
    height: TAB_BAR_HEIGHT,
    borderRadius: 28,
    borderTopWidth: 0,     // remove default top border
    backgroundColor: 'transparent',
    elevation: 0,          // shadow provided by GlassTabBar
  },
  tabBarBackground: () => <GlassTabBar />,
  headerStyle: {
    backgroundColor: BRAND.bg,
    shadowColor: 'transparent',
    elevation: 0,
  },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: {
    fontWeight: '700' as const,
    fontSize: 17,
    color: '#FFFFFF',
  },
  // Add a subtle left border accent matching the active color
  headerLeft: () => (
    <View style={{
      width: 3, height: 20, borderRadius: 2,
      backgroundColor: activeColor, marginLeft: 16,
    }} />
  ),
});


// ═══════════════════════════════════════════════════════════════════════════
// STUDENT TAB NAVIGATOR
// ═══════════════════════════════════════════════════════════════════════════
const StudentTabNavigator: React.FC = () => (
  <StudentTab.Navigator
    screenOptions={({ route }) => ({
      ...buildTabScreenOptions(BRAND.red),
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof iconsMap;
        switch (route.name) {
          case 'Dashboard': iconName = focused ? 'home'          : 'home-outline';          break;
          case 'Notes':     iconName = focused ? 'document-text' : 'document-text-outline'; break;
          case 'Marks':     iconName = focused ? 'bar-chart'     : 'bar-chart-outline';     break;
          case 'Attendance':iconName = focused ? 'calendar'      : 'calendar-outline';      break;
          case 'Profile':   iconName = focused ? 'person'        : 'person-outline';        break;
          default:          iconName = 'help-circle';
        }
        return <Icon name={iconName} size={size} color={color} />;
      },
    })}
  >
    <StudentTab.Screen name="Dashboard"  component={StudentDashboardScreen}  options={{ title: 'Home' }} />
    <StudentTab.Screen name="Notes"      component={StudentNotesScreen}      options={{ title: 'Notes' }} />
    <StudentTab.Screen name="Marks"      component={StudentMarksScreen}      options={{ title: 'Marks' }} />
    <StudentTab.Screen name="Attendance" component={StudentAttendanceScreen} options={{ title: 'Attend' }} />
    <StudentTab.Screen name="Profile"    component={StudentProfileScreen}    options={{ title: 'Profile' }} />
  </StudentTab.Navigator>
);


// ═══════════════════════════════════════════════════════════════════════════
// PARENT TAB NAVIGATOR
// ═══════════════════════════════════════════════════════════════════════════
const ParentTabNavigator: React.FC = () => (
  <ParentTab.Navigator
    screenOptions={({ route }) => ({
      ...buildTabScreenOptions(BRAND.teal),
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof iconsMap;
        switch (route.name) {
          case 'Dashboard': iconName = focused ? 'home'   : 'home-outline';   break;
          case 'Children':  iconName = focused ? 'people' : 'people-outline'; break;
          case 'Marks':     iconName = focused ? 'school' : 'school-outline'; break;
          case 'Profile':   iconName = focused ? 'person' : 'person-outline'; break;
          default:          iconName = 'help-circle';
        }
        return <Icon name={iconName} size={size} color={color} />;
      },
    })}
  >
    <ParentTab.Screen name="Dashboard" component={ParentDashboardScreen} options={{ title: 'Home' }} />
    <ParentTab.Screen name="Children"  component={ParentChildrenScreen}  options={{ title: 'Children' }} />
    <ParentTab.Screen name="Marks"     component={ParentMarksScreen}     options={{ title: 'Marks' }} />
    <ParentTab.Screen name="Profile"   component={ParentProfileScreen}   options={{ title: 'Profile' }} />
  </ParentTab.Navigator>
);


// ═══════════════════════════════════════════════════════════════════════════
// STUDENT STACK (adds Calendar)
// ═══════════════════════════════════════════════════════════════════════════
const StudentStackNavigator: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="StudentTabs"
      component={StudentTabNavigator}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Calendar"
      component={CalendarScreen}
      options={{
        title: 'Class Calendar',
        headerShown: true,
        presentation: 'card',
        headerStyle: { backgroundColor: BRAND.bg },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', color: '#FFFFFF' },
      }}
    />
  </Stack.Navigator>
);


// ═══════════════════════════════════════════════════════════════════════════
// MAIN NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════
const Navigation: React.FC = () => {
  const { user, loading } = useAuth();
  const navigationRef = useNavigationContainerRef<any>();
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (!navigationRef.isReady()) return;

      if (user?.role === 'student') {
        if (data.screen === 'Notes')
          navigationRef.navigate('StudentApp', { screen: 'StudentTabs', params: { screen: 'Notes' } });
        else if (data.screen === 'Marks')
          navigationRef.navigate('StudentApp', { screen: 'StudentTabs', params: { screen: 'Marks' } });
        else if (data.screen === 'Schedule' || data.screen === 'Calendar')
          navigationRef.navigate('StudentApp', { screen: 'Calendar' });
        else if (data.screen === 'Dashboard')
          navigationRef.navigate('StudentApp', { screen: 'StudentTabs', params: { screen: 'Dashboard' } });
      } else if (user?.role === 'parent') {
        if (data.screen === 'ChildMarks')
          navigationRef.navigate('ParentApp', { screen: 'ParentTabs', params: { screen: 'Marks' } });
        else if (data.screen === 'ChildSchedule')
          navigationRef.navigate('ParentApp', { screen: 'ParentTabs', params: { screen: 'Dashboard' } });
      }
    });

    return () => { if (responseListener.current) responseListener.current.remove(); };
  }, [user]);

  if (loading) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'student' ? (
          <Stack.Screen name="StudentApp" component={StudentStackNavigator} />
        ) : user.role === 'parent' ? (
          <Stack.Screen name="ParentApp" component={ParentTabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════
const App: React.FC = () => {
  const [appIsReady, setAppIsReady]             = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await Font.loadAsync({});
        console.log('✅ Assets loaded');
      } catch (e) {
        console.error('❌ Asset loading error:', e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  const handleAnimationEnd = useCallback(() => {
    setShowAnimatedSplash(false);
  }, []);

  if (!appIsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <AuthProvider>
        <Navigation />
        {showAnimatedSplash && (
          <AnimatedSplashScreen onAnimationEnd={handleAnimationEnd} />
        )}
      </AuthProvider>
    </GestureHandlerRootView>
  );
};

export default App;