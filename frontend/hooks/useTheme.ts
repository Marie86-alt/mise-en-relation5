// hooks/useTheme.ts - Theme Hook for Easy Access
// Hook simple pour accéder au contexte de thème depuis n'importe quel composant

import { useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';

/**
 * Hook pour accéder au thème global et aux fonctions de gestion du thème
 * @returns {ThemeContextType} Contexte du thème avec isDark, theme, toggleTheme, themeType
 * @throws {Error} Si utilisé en dehors d'un ThemeProvider
 * 
 * @example
 * const { isDark, theme, toggleTheme } = useTheme();
 */
export const useTheme = () => {
    const context = useContext(ThemeContext);

    if (context === undefined) {
          throw new Error(
                  'useTheme doit être utilisé dans un composant enfant de ThemeProvider'
                );
    }

    return context;
};

export default useTheme;
