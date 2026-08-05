// src/components/FormModal.tsx
// Shared bottom-sheet form wrapper used by the admin create/edit screens.
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface FormModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  children: React.ReactNode;
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
});

export const FormModal: React.FC<FormModalProps> = ({ visible, title, onClose, onSave, saving, saveLabel = 'Save', children }) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[s.title, { color: colors.textPrimary }]}>{title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <View style={s.footer}>
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]} onPress={onClose}>
              <Text style={[s.btnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.teal }]} onPress={onSave} disabled={saving}>
              <Text style={[s.btnText, { color: '#fff' }]}>{saving ? 'Saving…' : saveLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const formInputStyle = (colors: ReturnType<typeof useTheme>['colors']) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 10,
  fontSize: 15,
  color: colors.textPrimary,
  marginBottom: 12,
});
