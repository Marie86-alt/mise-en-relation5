// components/ThemeToggle.tsx
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle = () => {
    const { isDark, toggleTheme, theme } = useTheme();

    return (
          <Pressable
                  onPress={toggleTheme}
                  style={({ pressed }) => [
                            styles.button,
                    {
                                backgroundColor: theme.surface,
                                opacity: pressed ? 0.7 : 1,
                    },
                          ]}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                <Text style={[styles.emoji, { color: theme.text }]}>
                  {isDark ? '☀️' : '🌙'}
                </Text>Text>
          </Pressable>Pressable>
        );
};

const styles = StyleSheet.create({
    button: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 8,
    },
    emoji: {
          fontSize: 18,
          fontWeight: '600',
    },
});</Pressable>
