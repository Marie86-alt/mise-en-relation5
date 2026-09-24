// components/ui/Chip.tsx
// Pastille sélectionnable (choix unique ou multiple) : grande zone tactile, thème clair/sombre,
// état annoncé aux lecteurs d'écran.
import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface ChipProps {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  /** Ligne secondaire (ex. : prix sous une durée) */
  sublabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Chip({
  label,
  onPress,
  selected = false,
  disabled = false,
  sublabel,
  icon,
  style,
  accessibilityLabel,
}: ChipProps) {
  const { theme } = useTheme();
  const foreground = selected ? '#ffffff' : theme.text;
  const secondary = selected ? 'rgba(255,255,255,0.85)' : theme.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? (sublabel ? `${label}, ${sublabel}` : label)}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={secondary} style={styles.icon} /> : null}
      <View>
        <Text style={[styles.label, { color: foreground }]} allowFontScaling>
          {label}
        </Text>
        {sublabel ? (
          <Text style={[styles.sublabel, { color: secondary }]} allowFontScaling>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
  },
  icon: { marginRight: 6 },
  label: { fontSize: 15, fontWeight: '600' },
  sublabel: { fontSize: 12, marginTop: 2 },
});
