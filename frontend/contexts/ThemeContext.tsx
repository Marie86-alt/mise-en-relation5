// contexts/ThemeContext.tsx - Theme Management System
// Gère le thème global avec détection système, persistance et hook useTheme

import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme, ThemeColors, ThemeType } from '@/constants/themes';

interface ThemeContextType {
    isDark: boolean;
    theme: ThemeColors;
    toggleTheme: () => void;
    themeType: ThemeType;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

const THEME_KEY = '@app_theme_preference';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const colorScheme = useColorScheme();
    const [isDark, setIsDark] = useState<boolean>(colorScheme === 'dark');
    const [isLoading, setIsLoading] = useState(true);

    // Charger la préférence sauvegardée au démarrage
    useEffect(() => {
          const loadThemePreference = async () => {
                  try {
                            const savedTheme = await AsyncStorage.getItem(THEME_KEY);
                            if (savedTheme !== null) {
                                        // Utiliser la préférence sauvegardée
                              setIsDark(savedTheme === 'dark');
                            } else {
                                        // Utiliser la préférence système si aucune préférence sauvegardée
                              setIsDark(colorScheme === 'dark');
                            }
                  } catch (error) {
                            console.warn('Erreur lors du chargement de la préférence de thème:', error);
                            // Fallback sur la préférence système
                    setIsDark(colorScheme === 'dark');
                  } finally {
                            setIsLoading(false);
                  }
          };

                  loadThemePreference();
    }, [colorScheme]);

    // Basculer le thème et le sauvegarder
    const toggleTheme = async () => {
          const newIsDark = !isDark;
          setIsDark(newIsDark);

          try {
                  await AsyncStorage.setItem(THEME_KEY, newIsDark ? 'dark' : 'light');
          } catch (error) {
                  console.warn('Erreur lors de la sauvegarde de la préférence de thème:', error);
                  // Ne pas faire échouer le basculement si la sauvegarde échoue
          }
    };

    const themeType: ThemeType = isDark ? 'dark' : 'light';
    const theme = getTheme(isDark);

    // Toujours fournir le contexte, même pendant le chargement
    return (
          <ThemeContext.Provider
                  value={{
                            isDark,
                            theme,
                            toggleTheme,
                            themeType,
                  }}
                >
            {children}
          </ThemeContext.Provider>
        );
};

export default ThemeContext;
