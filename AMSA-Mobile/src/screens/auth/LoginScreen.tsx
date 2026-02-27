// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/Icon';
import BouncingDotsLoader from '../../components/BouncingDotsLoader';
import { BRAND } from '../../components/theme';
import { GlassCard } from '../../components/GlassCard';



// ════════════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════════════
const LoginScreen = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch {
      // Error handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── 4-colour top strip ───────────────────────────────────────── */}
      <View style={s.accentStrip}>
        {[BRAND.red, BRAND.yellow, BRAND.teal, BRAND.blue].map((c, i) => (
          <View key={i} style={[s.accentDash, { backgroundColor: c }]} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── LOGO / HEADER ────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.logoRing}>
            <Image
              source={require('../../../assets/amsaIcon.png')}
              style={s.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={s.title}>AMSA LMS</Text>
          <Text style={s.subtitle}>Sign in to your account</Text>
        </View>

        {/* ── FORM CARD ────────────────────────────────────────────────── */}
        <GlassCard style={s.card}>
          <View style={s.cardInner}>

            {/* Email */}
            <View style={s.fieldLabel}>
              <Text style={s.labelText}>Email Address</Text>
            </View>
            <View style={s.inputRow}>
              <Icon name="person-outline" size={18} color={BRAND.textMuted} />
              <TextInput
                style={s.input}
                placeholder="your@email.com"
                placeholderTextColor={BRAND.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={s.divider} />

            {/* Password */}
            <View style={s.fieldLabel}>
              <Text style={s.labelText}>Password</Text>
            </View>
            <View style={s.inputRow}>
              <Icon name="lock-closed-outline" size={18} color={BRAND.textMuted} />
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={BRAND.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.showBtn}>
                <Text style={s.showBtnText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </GlassCard>

        {/* ── SIGN IN BUTTON ────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.loginBtn, loading && s.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <BouncingDotsLoader size={10} colors={['#fff', '#fff', '#fff']} />
          ) : (
            <Text style={s.loginBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* ── HINT ─────────────────────────────────────────────────────── */}
        <View style={s.hint}>
          <View style={[s.hintAccent, { backgroundColor: BRAND.teal }]} />
          <Text style={s.hintText}>
            Use your credentials provided by your school administrator
          </Text>
        </View>

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <Text style={s.footer}>Learning Management System v1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },

  // Accent strip
  accentStrip: { flexDirection: 'row', height: 3 },
  accentDash:  { flex: 1 },

  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  // Header
  header:   { alignItems: 'center', marginBottom: 36 },
  logoRing: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: BRAND.surface, borderWidth: 1, borderColor: BRAND.border,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    overflow: 'hidden',
  },
  logoImage: { width: 80, height: 80 },
  title:    { fontSize: 30, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: BRAND.textSecondary, marginTop: 6 },

  // Card
  card:      { marginBottom: 16 },
  cardInner: { padding: 20 },

  // Field label
  fieldLabel: { marginBottom: 8 },
  labelText:  { fontSize: 11, fontWeight: '700', color: BRAND.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },

  // Input row
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: BRAND.borderStrong,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 2,
  },
  input: { flex: 1, fontSize: 15, color: BRAND.textPrimary, paddingVertical: 14 },
  showBtn:     { paddingHorizontal: 4, paddingVertical: 6 },
  showBtnText: { fontSize: 10, fontWeight: '700', color: BRAND.teal, letterSpacing: 0.5 },

  // Divider between fields
  divider: { height: 1, backgroundColor: BRAND.border, marginVertical: 16 },

  // Login button
  loginBtn: {
    backgroundColor: BRAND.teal,
    paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    shadowColor: BRAND.teal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  // Hint
  hint: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: BRAND.tealDim, borderWidth: 1, borderColor: BRAND.teal + '33',
    borderRadius: 12, padding: 14, marginBottom: 32,
  },
  hintAccent: { width: 3, height: '100%', borderRadius: 2, alignSelf: 'stretch' },
  hintText:   { flex: 1, fontSize: 13, color: BRAND.teal, lineHeight: 18 },

  // Footer
  footer: { fontSize: 12, color: BRAND.textMuted, textAlign: 'center' },
});

export default LoginScreen;
