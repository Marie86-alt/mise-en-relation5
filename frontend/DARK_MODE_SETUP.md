# 🌙 Dark Mode System - Guide Complet

## 📋 Vue d'Ensemble

Un système de thème professionnel et complet pour votre application React Native avec:
- ✅ Détection automatique des préférences système
- - ✅ Toggle manuel light/dark
  - - ✅ Sauvegarde persistante (AsyncStorage)
    - - ✅ Palettes optimisées pour accessibilité
      - - ✅ Hook `useTheme()` pour accès facile
       
        - ---

        ## 🏗️ Architecture

        ```
        frontend/
        ├── constants/
        │   └── themes.ts          # Palettes light et dark
        ├── contexts/
        │   └── ThemeContext.tsx   # Provider et management
        ├── hooks/
        │   └── useTheme.ts        # Hook pour accès facile
        └── DARK_MODE_SETUP.md     # Cette documentation
        ```

        ---

        ## 🎨 Palettes de Couleurs

        ### Light Theme
        ```typescript
        {
          background: '#ffffff',        // Blanc pur
          surface: '#f9fafb',          // Gris très clair
          text: '#11181C',             // Noir profond
          primary: '#0066cc',          // Bleu
          success: '#10b981',          // Vert
          warning: '#f59e0b',          // Ambre
          danger: '#ef4444',           // Rouge
        }
        ```

        ### Dark Theme
        ```typescript
        {
          background: '#0f172a',       // Bleu-noir (OLED friendly)
          surface: '#1a2332',          // Gris-bleu foncé
          text: '#f8fafc',             // Blanc cassé (moins agressif)
          primary: '#60a5fa',          // Bleu clair
          success: '#34d399',          // Vert clair
          warning: '#fbbf24',          // Ambre clair
          danger: '#f87171',           // Rouge clair
        }
        ```

        ---

        ## 🚀 Installation et Configuration

        ### 1. Installer AsyncStorage (si pas déjà installé)
        ```bash
        npm install @react-native-async-storage/async-storage
        # ou
        yarn add @react-native-async-storage/async-storage
        ```

        ### 2. Enrouler votre app avec ThemeProvider

        Dans votre `App.tsx` ou `RootLayout.tsx`:

        ```typescript
        import { ThemeProvider } from '@/contexts/ThemeContext';

        export default function RootLayout() {
          return (
            <ThemeProvider>
              {/* Votre contenu ici */}
            </ThemeProvider>
          );
        }
        ```

        ---

        ## 💻 Utilisation dans les Composants

        ### Accéder au thème

        ```typescript
        import { useTheme } from '@/hooks/useTheme';
        import { View, Text } from 'react-native';

        export function MyComponent() {
          const { isDark, theme, toggleTheme } = useTheme();

          return (
            <View style={{ backgroundColor: theme.background }}>
              <Text style={{ color: theme.text }}>
                Mode: {isDark ? '🌙 Sombre' : '☀️ Clair'}
              </Text>
              <Button title="Basculer thème" onPress={toggleTheme} />
            </View>
          );
        }
        ```

        ### Styles dynamiques basés sur le thème

        ```typescript
        import { StyleSheet } from 'react-native';
        import { useTheme } from '@/hooks/useTheme';

        export function ThemedCard() {
          const { theme } = useTheme();

          const styles = StyleSheet.create({
            card: {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              padding: 16,
            },
            text: {
              color: theme.text,
            },
          });

          return (
            <View style={styles.card}>
              <Text style={styles.text}>Contenu du card</Text>
            </View>
          );
        }
        ```

        ### Utiliser les couleurs de statut

        ```typescript
        const { theme } = useTheme();

        const statusColors = {
          success: theme.success,      // ✅ Vert
          warning: theme.warning,      // ⚠️ Ambre
          danger: theme.danger,        // ❌ Rouge
          info: theme.info,            // ℹ️ Bleu
        };
        ```

        ---

        ## 🎯 Cas d'Usage Avancés

        ### 1. Thème avec animations de transition

        ```typescript
        import { useTheme } from '@/hooks/useTheme';
        import Animated, {
          withTiming,
          useAnimatedStyle,
          useSharedValue,
        } from 'react-native-reanimated';

        export function AnimatedThemeCard() {
          const { isDark, theme } = useTheme();
          const bgColor = useSharedValue(isDark ? theme.background : '#fff');

          useEffect(() => {
            bgColor.value = withTiming(
              isDark ? theme.background : '#fff',
              { duration: 300 }
            );
          }, [isDark]);

          const animatedStyle = useAnimatedStyle(() => ({
            backgroundColor: bgColor.value,
          }));

          return <Animated.View style={animatedStyle} />;
        }
        ```

        ### 2. Déterminer si un thème est sombre

        ```typescript
        const { isDark } = useTheme();

        if (isDark) {
          // Logique spécifique au mode sombre
        } else {
          // Logique spécifique au mode clair
        }
        ```

        ### 3. Hook pour styles conditionnels

        ```typescript
        function useThemedStyles() {
          const { theme, isDark } = useTheme();

          return StyleSheet.create({
            container: {
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
            text: {
              color: theme.text,
              fontSize: isDark ? 16 : 14, // Ajuster par thème
            },
          });
        }
        ```

        ---

        ## 📱 Comportement de Détection

        1. **Au démarrage:**
        2.    - Vérifier la préférence sauvegardée dans AsyncStorage
              -    - Si trouvée → Utiliser cette préférence
                   -    - Sinon → Utiliser la préférence système
                    
                        - 2. **Au basculement:**
                          3.    - Met à jour l'état local immédiatement
                                -    - Sauvegarde dans AsyncStorage de manière asynchrone
                                     -    - Les erreurs de sauvegarde n'interrompent pas le basculement
                                      
                                          - ---

                                          ## 🔄 Intégration avec AdminStyles

                                          Pour intégrer le dark mode avec votre `adminStyles.ts` existant:

                                          ```typescript
                                          import { useTheme } from '@/hooks/useTheme';
                                          import { s } from '@/components/admin/adminStyles';

                                          export function AdminComponent() {
                                            const { theme, isDark } = useTheme();

                                            return (
                                              <View style={[
                                                s.card,
                                                { backgroundColor: theme.surface }
                                              ]}>
                                                {/* Contenu */}
                                              </View>
                                            );
                                          }
                                          ```

                                          ---

                                          ## 🎛️ Toggle de Thème dans l'En-tête

                                          Créer un composant réutilisable:

                                          ```typescript
                                          // components/ThemeToggle.tsx
                                          import { Pressable, Text } from 'react-native';
                                          import { useTheme } from '@/hooks/useTheme';

                                          export function ThemeToggle() {
                                            const { isDark, toggleTheme, theme } = useTheme();

                                            return (
                                              <Pressable
                                                onPress={toggleTheme}
                                                style={{
                                                  padding: 10,
                                                  borderRadius: 8,
                                                  backgroundColor: theme.surface,
                                                }}
                                              >
                                                <Text style={{ fontSize: 20 }}>
                                                  {isDark ? '🌙' : '☀️'}
                                                </Text>
                                              </Pressable>
                                            );
                                          }
                                          ```

                                          Puis l'ajouter dans votre Header:

                                          ```typescript
                                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {/* Autres éléments */}
                                            <ThemeToggle />
                                          </View>
                                          ```

                                          ---

                                          ## 🧪 Tests

                                          ```typescript
                                          import { renderHook, act } from '@testing-library/react-hooks';
                                          import { useTheme } from '@/hooks/useTheme';
                                          import { ThemeProvider } from '@/contexts/ThemeContext';

                                          describe('useTheme', () => {
                                            it('devrait toggle le thème', () => {
                                              const wrapper = ({ children }) => (
                                                <ThemeProvider>{children}</ThemeProvider>
                                              );

                                              const { result } = renderHook(() => useTheme(), { wrapper });

                                              expect(result.current.isDark).toBe(false);

                                              act(() => {
                                                result.current.toggleTheme();
                                              });

                                              expect(result.current.isDark).toBe(true);
                                            });
                                          });
                                          ```

                                          ---

                                          ## 📚 Ressources

                                          - [React Native useColorScheme](https://reactnative.dev/docs/usecolorscheme)
                                          - - [AsyncStorage Documentation](https://react-native-async-storage.github.io/async-storage/)
                                            - - [Material Design Dark Theme](https://material.io/design/color/dark-theme.html)
                                              - - [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum)
                                               
                                                - ---

                                                ## 🐛 Dépannage

                                                ### Le thème ne se sauvegarde pas
                                                → Vérifier que AsyncStorage est correctement installé et lié

                                                ### Scintillement lors du chargement
                                                → Ajouter un écran de splash/loading pendant le chargement initial

                                                ### Contexte undefined dans les tests
                                                → Enrouler les composants avec `<ThemeProvider>` dans les tests

                                                ---

                                                ## ✅ Checklist d'Implémentation

                                                - [ ] Installer AsyncStorage
                                                - [ ] - [ ] Copier les fichiers de thème
                                                - [ ] - [ ] Enrouler l'app avec ThemeProvider
                                                - [ ] - [ ] Tester useTheme() dans un composant
                                                - [ ] - [ ] Ajouter ThemeToggle dans l'en-tête
                                                - [ ] - [ ] Mettre à jour adminStyles pour utiliser theme
                                                - [ ] - [ ] Tester le basculement light/dark
                                                - [ ] - [ ] Vérifier la sauvegarde persistante
                                                - [ ] - [ ] Tester sur les deux modes système (light/dark)
                                               
                                                - [ ] ---
                                               
                                                - [ ] **Version**: 1.0
                                                - [ ] **Date**: Janvier 2026
                                                - [ ] **Branche**: mariecorrection
