// src/screens/shared/NotificationSettingsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { BrandPalette } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';
import { Icon } from '../../components/Icon';
import { registerForPushNotificationsAsync, removePushToken } from '../../utils/notifications';
import { useTheme } from '../../context/ThemeContext';

type PermissionState = 'granted' | 'denied' | 'undetermined' | 'loading';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, paddingTop: 24 },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },

  card: { padding: 28, alignItems: 'center', marginBottom: 16 },

  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 20, fontWeight: '700', color: colors.textPrimary,
    textAlign: 'center', marginBottom: 12,
  },
  body: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: 24,
  },
  button: {
    width: '100%', padding: 16, borderRadius: 16, alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: { fontSize: 15, fontWeight: '700' },

  hintCard:  { padding: 20 },
  hintTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  hintBody:  { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});

const NotificationSettingsScreen = () => {
  const { colors: BRAND } = useTheme();
  const s = useMemo(() => makeStyles(BRAND), [BRAND]);

  const [permissionState, setPermissionState] = useState<PermissionState>('loading');
  const [actionLoading, setActionLoading] = useState(false);

  const checkPermissions = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionState(status as PermissionState);
  }, []);

  useEffect(() => { checkPermissions(); }, [checkPermissions]);

  const handleEnable = async () => {
    setActionLoading(true);
    try {
      await registerForPushNotificationsAsync();
      await checkPermissions();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async () => {
    setActionLoading(true);
    try {
      await removePushToken();
      setPermissionState('denied');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  if (permissionState === 'loading') {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={BRAND.teal} size="large" />
      </View>
    );
  }

  const config = {
    granted: {
      icon: 'notifications' as const,
      iconBg: BRAND.tealDim,
      iconColor: BRAND.teal,
      title: 'Notifications are enabled',
      body: 'You will receive push notifications for attendance, marks, and class updates.',
      buttonLabel: 'Disable Notifications',
      buttonColor: BRAND.red,
      buttonBg: BRAND.redDim,
      onPress: handleDisable,
    },
    denied: {
      icon: 'notifications-off-outline' as const,
      iconBg: BRAND.redDim,
      iconColor: BRAND.red,
      title: 'Notifications are blocked',
      body: 'Your device has blocked notifications for this app. Open your device settings to enable them.',
      buttonLabel: 'Open Device Settings',
      buttonColor: BRAND.blue,
      buttonBg: BRAND.blueDim,
      onPress: handleOpenSettings,
    },
    undetermined: {
      icon: 'notifications-outline' as const,
      iconBg: BRAND.yellowDim,
      iconColor: BRAND.yellow,
      title: "You haven't enabled notifications",
      body: 'Enable push notifications to get attendance alerts, mark releases, and class reminders.',
      buttonLabel: 'Enable Notifications',
      buttonColor: BRAND.teal,
      buttonBg: BRAND.tealDim,
      onPress: handleEnable,
    },
  }[permissionState] ?? {
    icon: 'notifications-outline' as const,
    iconBg: BRAND.yellowDim,
    iconColor: BRAND.yellow,
    title: "You haven't enabled notifications",
    body: 'Enable push notifications to get attendance alerts, mark releases, and class reminders.',
    buttonLabel: 'Enable Notifications',
    buttonColor: BRAND.teal,
    buttonBg: BRAND.tealDim,
    onPress: handleEnable,
  };

  return (
    <View style={s.container}>
      <GlassCard style={s.card}>
        <View style={[s.iconWrap, { backgroundColor: config.iconBg }]}>
          <Icon name={config.icon} size={36} color={config.iconColor} />
        </View>
        <Text style={s.title}>{config.title}</Text>
        <Text style={s.body}>{config.body}</Text>

        <TouchableOpacity
          style={[s.button, { backgroundColor: config.buttonBg, borderColor: config.buttonColor + '44' }]}
          onPress={config.onPress}
          disabled={actionLoading}
          activeOpacity={0.8}
        >
          {actionLoading ? (
            <ActivityIndicator color={config.buttonColor} />
          ) : (
            <Text style={[s.buttonText, { color: config.buttonColor }]}>{config.buttonLabel}</Text>
          )}
        </TouchableOpacity>
      </GlassCard>

      {permissionState === 'denied' && (
        <GlassCard style={[s.card, s.hintCard]}>
          <Text style={s.hintTitle}>How to enable notifications</Text>
          {Platform.OS === 'android' ? (
            <Text style={s.hintBody}>
              Settings → Apps → AMSA → Notifications → Allow notifications
            </Text>
          ) : (
            <Text style={s.hintBody}>
              Settings → AMSA → Notifications → Allow Notifications
            </Text>
          )}
        </GlassCard>
      )}
    </View>
  );
};

export default NotificationSettingsScreen;
