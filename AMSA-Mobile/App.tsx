// App.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { View, Text, StyleSheet, Platform, AppState, Modal, TouchableOpacity, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { BlurView } from 'expo-blur';

// Import custom Icon component
import { iconsMap } from './src/components/icons';
import { Icon } from './src/components/Icon';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from './src/components/layout';
import { BrandPalette, BRAND } from './src/components/theme';
import { AnimatedSplashScreen } from './src/components/AnimatedSplashScreen';

// Import Screens
import NotificationSettingsScreen from './src/screens/shared/NotificationSettingsScreen';
import NotificationListScreen from './src/screens/shared/NotificationListScreen';
import { registerForPushNotificationsAsync, getNotificationPermissionStatus } from './src/utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/screens/auth/LoginScreen';
import StudentDashboardScreen from './src/screens/student/DashboardScreen';
import StudentNotesScreen from './src/screens/student/NotesScreen';
import StudentMarksScreen from './src/screens/student/MarksScreen';
import StudentProfileScreen from './src/screens/student/ProfileScreen';
import CalendarScreen from './src/screens/student/CalendarScreen';
import ClassDetailsScreen from './src/screens/student/ClassDetailsScreen';
import StudentAttendanceScreen from './src/screens/student/AttendanceScreen';

// Parent Screens
import ParentDashboardScreen from './src/screens/parent/DashboardScreen';
import ParentChildrenScreen from './src/screens/parent/ChildrenScreen';
import ParentMarksScreen from './src/screens/parent/MarksScreen';
import ParentAttendanceScreen from './src/screens/parent/AttendanceScreen';
import ParentMessagesScreen from './src/screens/parent/MessagesScreen';
import ParentProfileScreen from './src/screens/parent/ProfileScreen';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const StudentTab = createBottomTabNavigator();
const ParentTab = createBottomTabNavigator();

// ═══════════════════════════════════════════════════════════════════════════
// FLOATING GLASSMORPHISM TAB BAR BACKGROUND
// ═══════════════════════════════════════════════════════════════════════════
const makeGlassStyles = (colors: BrandPalette) => StyleSheet.create({
  wrapper: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
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
    backgroundColor: colors.glassInnerHighlight,
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

const GlassTabBar: React.FC = () => {
  const { colors, mode } = useTheme();
  const gs = makeGlassStyles(colors);
  return (
    <View style={gs.wrapper} pointerEvents="none">
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={60}
          tint={mode === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassBg }]} />
      )}
      <View style={gs.innerHighlight} />
      <View style={gs.accentBar}>
        <View style={[gs.accentSegment, { backgroundColor: colors.red,    flex: 3 }]} />
        <View style={[gs.accentSegment, { backgroundColor: colors.yellow, flex: 1 }]} />
        <View style={[gs.accentSegment, { backgroundColor: colors.teal,   flex: 1 }]} />
        <View style={[gs.accentSegment, { backgroundColor: colors.blue,   flex: 1 }]} />
      </View>
    </View>
  );
};

// ─── Shared tab screen options factory ──────────────────────────────────────
const buildTabScreenOptions = (activeColor: string, colors: BrandPalette) => ({
  tabBarActiveTintColor: activeColor,
  tabBarInactiveTintColor: colors.textSecondary,
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  tabBarIconStyle: { marginTop: 4 },
  tabBarStyle: {
    position: 'absolute' as const,
    bottom: TAB_BAR_BOTTOM_OFFSET,
    left: 20,
    right: 20,
    height: TAB_BAR_HEIGHT,
    borderRadius: 28,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabBarBackground: () => <GlassTabBar />,
  headerStyle: {
    backgroundColor: colors.bg,
    shadowColor: 'transparent',
    elevation: 0,
  },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: {
    fontWeight: '700' as const,
    fontSize: 17,
    color: colors.textPrimary,
  },
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
const StudentTabNavigator: React.FC = () => {
  const { colors } = useTheme();
  return (
    <StudentTab.Navigator
      screenOptions={({ route }) => ({
        ...buildTabScreenOptions(colors.red, colors),
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
};


// ═══════════════════════════════════════════════════════════════════════════
// PARENT TAB NAVIGATOR
// ═══════════════════════════════════════════════════════════════════════════
const ParentTabNavigator: React.FC = () => {
  const { colors } = useTheme();
  return (
    <ParentTab.Navigator
      screenOptions={({ route }) => ({
        ...buildTabScreenOptions(colors.teal, colors),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof iconsMap;
          switch (route.name) {
            case 'Dashboard':  iconName = focused ? 'home'     : 'home-outline';     break;
            case 'Children':   iconName = focused ? 'people'   : 'people-outline';   break;
            case 'Marks':      iconName = focused ? 'school'   : 'school-outline';   break;
            case 'Attendance': iconName = focused ? 'calendar' : 'calendar-outline'; break;
            case 'Profile':    iconName = focused ? 'person'   : 'person-outline';   break;
            default:           iconName = 'help-circle';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <ParentTab.Screen name="Dashboard"  component={ParentDashboardScreen}  options={{ title: 'Home' }} />
      <ParentTab.Screen name="Children"  component={ParentChildrenScreen}   options={{ title: 'Children' }} />
      <ParentTab.Screen name="Marks"     component={ParentMarksScreen}      options={{ title: 'Marks' }} />
      <ParentTab.Screen name="Attendance" component={ParentAttendanceScreen} options={{ title: 'Attend' }} />
      <ParentTab.Screen name="Profile"   component={ParentProfileScreen}    options={{ title: 'Profile' }} />
    </ParentTab.Navigator>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// PARENT STACK
// ═══════════════════════════════════════════════════════════════════════════
const ParentStackNavigator: React.FC = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ParentTabs"
        component={ParentTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          title: 'Notification Settings',
          headerShown: true,
          presentation: 'card',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
        }}
      />
      <Stack.Screen
        name="NotificationList"
        component={NotificationListScreen}
        options={{ headerShown: false, presentation: 'card' }}
      />
      <Stack.Screen
        name="Messages"
        component={ParentMessagesScreen}
        options={{ headerShown: false, presentation: 'card' }}
      />
    </Stack.Navigator>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// STUDENT STACK
// ═══════════════════════════════════════════════════════════════════════════
const StudentStackNavigator: React.FC = () => {
  const { colors } = useTheme();
  return (
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
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
        }}
      />
      <Stack.Screen
        name="ClassDetails"
        component={ClassDetailsScreen}
        options={{
          title: 'Class Details',
          headerShown: true,
          presentation: 'card',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          title: 'Notification Settings',
          headerShown: true,
          presentation: 'card',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
        }}
      />
      <Stack.Screen
        name="NotificationList"
        component={NotificationListScreen}
        options={{ headerShown: false, presentation: 'card' }}
      />
    </Stack.Navigator>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// MAIN NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════
const Navigation: React.FC = () => {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const navigationRef = useNavigationContainerRef<any>();
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Show a once-per-day prompt when permission is denied
  useEffect(() => {
    if (!user) return;
    (async () => {
      const status = await getNotificationPermissionStatus();
      if (status !== 'denied') return;
      const lastShown = await AsyncStorage.getItem('notif_prompt_last_shown');
      const today = new Date().toDateString();
      if (lastShown === today) return;
      await AsyncStorage.setItem('notif_prompt_last_shown', today);
      setShowNotifModal(true);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        registerForPushNotificationsAsync().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [user]);

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
        else if (data.screen === 'ClassDetails' && data.classId)
          navigationRef.navigate('StudentApp', {
            screen: 'ClassDetails',
            params: { classId: data.classId, className: data.className },
          });
        else if (data.screen === 'Dashboard')
          navigationRef.navigate('StudentApp', { screen: 'StudentTabs', params: { screen: 'Dashboard' } });
        else if (data.screen === 'Notifications')
          navigationRef.navigate('StudentApp', { screen: 'NotificationList' });
      } else if (user?.role === 'parent') {
        if (data.screen === 'ChildMarks')
          navigationRef.navigate('ParentApp', { screen: 'ParentTabs', params: { screen: 'Marks' } });
        else if (data.screen === 'ChildSchedule')
          navigationRef.navigate('ParentApp', { screen: 'ParentTabs', params: { screen: 'Dashboard' } });
        else if (data.screen === 'Notifications')
          navigationRef.navigate('ParentApp', { screen: 'NotificationList' });
        else if (data.screen === 'Messages')
          navigationRef.navigate('ParentApp', { screen: 'Messages' });
      }
    });

    return () => { if (responseListener.current) responseListener.current.remove(); };
  }, [user]);

  if (loading) return null;

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : user.role === 'student' ? (
            <Stack.Screen name="StudentApp" component={StudentStackNavigator} />
          ) : user.role === 'parent' ? (
            <Stack.Screen name="ParentApp" component={ParentStackNavigator} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/* ── Notification Permission Modal ── */}
      <Modal transparent visible={showNotifModal} animationType="fade" onRequestClose={() => setShowNotifModal(false)}>
        <View style={navStyles.modalOverlay}>
          <View style={[navStyles.modalCard, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
            <View style={[navStyles.iconRing, { backgroundColor: BRAND.redDim, borderColor: BRAND.red }]}>
              <Icon name="notifications-off" size={32} color={BRAND.red} />
            </View>
            <Text style={[navStyles.modalTitle, { color: colors.textPrimary }]}>Stay in the loop</Text>
            <Text style={[navStyles.modalBody, { color: colors.textSecondary }]}>
              Enable notifications to receive announcements, class reminders, and attendance alerts.
            </Text>
            <TouchableOpacity
              style={[navStyles.primaryBtn, { backgroundColor: BRAND.red }]}
              onPress={() => { setShowNotifModal(false); Linking.openSettings(); }}
            >
              <Text style={navStyles.primaryBtnText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={navStyles.secondaryBtn} onPress={() => setShowNotifModal(false)}>
              <Text style={[navStyles.secondaryBtnText, { color: colors.textSecondary }]}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const navStyles = StyleSheet.create({
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  modalCard:       { width: '100%', maxWidth: 360, borderRadius: 28, padding: 32, alignItems: 'center', borderWidth: 1 },
  iconRing:        { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1 },
  modalTitle:      { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
  modalBody:       { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  primaryBtn:      { width: '100%', paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  primaryBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  secondaryBtn:    { paddingVertical: 10 },
  secondaryBtnText:{ fontSize: 15, fontWeight: '500' },
});


// ═══════════════════════════════════════════════════════════════════════════
// THEMED ROOT — reads theme so GestureHandlerRootView bg is reactive
// ═══════════════════════════════════════════════════════════════════════════
const ThemedRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      {children}
    </GestureHandlerRootView>
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

        if (!__DEV__ && Updates.isEnabled) {
          try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
              return;
            }
          } catch {
            // don't block launch if update check fails
          }
        }
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
    <ThemeProvider>
      <ThemedRoot>
        <AuthProvider>
          <Navigation />
          {showAnimatedSplash && (
            <AnimatedSplashScreen onAnimationEnd={handleAnimationEnd} />
          )}
        </AuthProvider>
      </ThemedRoot>
    </ThemeProvider>
  );
};

export default App;
