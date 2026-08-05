// src/screens/admin/ManageCardsScreen.tsx
// Audit list of every enrolled NFC card — status, last tap, and a quick
// revoke action for lost/stolen cards.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Icon } from '../../components/Icon';
import { useTheme } from '../../context/ThemeContext';
import { BrandPalette } from '../../components/theme';
import { cardsService, Card } from '../../services/cards';

const makeStyles = (colors: BrandPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginHorizontal: 20, marginBottom: 8, borderWidth: 1 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginRight: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
});

const ManageCardsScreen = () => {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await cardsService.listCards();
      setCards(res.cards || []);
    } catch {
      Alert.alert('Error', 'Could not load cards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = (card: Card) => {
    Alert.alert('Revoke Card', `Revoke ${card.student?.user?.name}'s card? It will stop working immediately.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke', style: 'destructive', onPress: async () => {
          try {
            await cardsService.revokeCard(card._id, 'Revoked from card audit list');
            load();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to revoke card');
          }
        }
      },
    ]);
  };

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Cards</Text>
        <Text style={s.subtitle}>{cards.length} enrolled</Text>
      </View>

      <FlatList
        data={cards}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>No cards enrolled yet</Text>}
        renderItem={({ item }) => {
          const active = item.status === 'active';
          const statusColor = active ? '#2E9E5B' : '#E8341C';
          return (
            <View style={[s.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowName, { color: colors.textPrimary }]}>{item.student?.user?.name || 'Unknown'}</Text>
                <Text style={[s.rowMeta, { color: colors.textSecondary }]}>
                  Grade {item.student?.grade} • {item.lastTapAt ? `Last tap ${new Date(item.lastTapAt).toLocaleString()}` : 'Never tapped'}
                </Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
                <Text style={[s.statusText, { color: statusColor }]}>{item.status}</Text>
              </View>
              {active && (
                <TouchableOpacity onPress={() => handleRevoke(item)}>
                  <Icon name="close-circle" size={20} color={colors.red} />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
};

export default ManageCardsScreen;
