// src/components/ChipSelector.tsx
// Shared multi/single-select chip row used across the admin CRUD forms
// (grade pickers, subject pickers, etc.) so it isn't reimplemented per screen.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ChipSelectorProps {
  options: (string | number)[];
  selected: (string | number)[];
  onToggle: (value: string | number) => void;
  accentColor?: string;
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
});

export const ChipSelector: React.FC<ChipSelectorProps> = ({ options, selected, onToggle, accentColor }) => {
  const { colors } = useTheme();
  const accent = accentColor || colors.teal;

  return (
    <View style={s.wrap}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[
              s.chip,
              {
                borderColor: isSelected ? accent : colors.border,
                backgroundColor: isSelected ? accent + '22' : colors.surfaceAlt,
              },
            ]}
            onPress={() => onToggle(opt)}
          >
            <Text style={[s.chipText, { color: isSelected ? accent : colors.textSecondary }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
