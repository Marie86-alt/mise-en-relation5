// components/SafeScreen.tsx
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  paddingHorizontal?: number;
}

export const SafeScreen: React.FC<SafeScreenProps> = ({
  children,
  style,
  backgroundColor = '#ffffff',
  paddingHorizontal = 0,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor,
          paddingLeft: Math.max(insets.left, paddingHorizontal),
          paddingRight: Math.max(insets.right, paddingHorizontal),
        },
        style
      ]}
      edges={['top', 'left', 'right']} // Pas 'bottom' car géré par les tabs
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});