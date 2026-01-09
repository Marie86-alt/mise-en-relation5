// constants/themes.ts - Dark Mode Theme System
// Système de thème professionnel avec light et dark mode

export type ThemeType = 'light' | 'dark';

export interface ThemeColors {
    // Backgrounds
  background: string;
    surface: string;
    surfaceSecondary: string;
    overlay: string;

  // Text
  text: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;

  // Borders
  border: string;
    borderLight: string;

  // Status colors
  primary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;

  // Shadows (utiliser avec elevation)
  shadow: string;
}

// ==================== LIGHT THEME ====================
export const lightTheme: ThemeColors = {
    // Backgrounds
    background: '#ffffff',
    surface: '#f9fafb',
    surfaceSecondary: '#f3f4f6',
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Text
    text: '#11181C',
    textSecondary: '#495057',
    textTertiary: '#6c757d',
    textInverse: '#ffffff',

    // Borders
    border: '#e8eef5',
    borderLight: '#f0f0f0',

    // Status colors
    primary: '#0066cc',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',

    // Shadows
    shadow: '#000000',
};

// ==================== DARK THEME ====================
export const darkTheme: ThemeColors = {
    // Backgrounds - Gris foncé moderne (pas noir pur)
    background: '#0f172a',
    surface: '#1a2332',
    surfaceSecondary: '#253449',
    overlay: 'rgba(0, 0, 0, 0.7)',

    // Text - Blanc cassé pour moins de fatigue oculaire
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    textInverse: '#0f172a',

    // Borders - Bleu gris subtil
    border: '#334155',
    borderLight: '#475569',

    // Status colors - Adaptées pour le contraste en dark
    primary: '#60a5fa',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    info: '#60a5fa',

    // Shadows
    shadow: '#000000',
};

// ==================== THEME CONFIGURATIONS ====================
export const themes = {
    light: lightTheme,
    dark: darkTheme,
};

// Fonction helper pour obtenir le thème
export const getTheme = (isDark: boolean): ThemeColors => {
    return isDark ? darkTheme : lightTheme;
};

// Export pour utilisation facile
export const ThemeConfig = {
    light: lightTheme,
    dark: darkTheme,
} as const;
