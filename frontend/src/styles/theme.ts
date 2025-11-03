
export const THEME = {
  // 🧡 COULEURS PRINCIPALES
  colors: {
    // Orange carotte (remplace le bleu #3498db)
    primary: '#FF6B35',
    primaryLight: '#FF8A65', 
    primaryDark: '#E64A19',
    
    // Fond blanc minimaliste
    background: '#FFFFFF',
    backgroundLight: '#FAFAFA',
    
    // Textes minimalistes
    textPrimary: '#212121',
    textSecondary: '#757575', 
    textLight: '#BDBDBD',
    
    // États
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    
    // Bordures minimalistes
    border: '#E0E0E0',
    borderFocus: '#FF6B35',
    
    // Statuts
    available: '#E8F5E8',
    unavailable: '#FFEBEE',
    verified: '#E3F2FD',
    
    // Ancien bleu (pour référence)
    oldBlue: '#3498db',
    oldDark: '#2c3e50',
    oldBackground: '#f8f9fa'
  },
  
  // 📏 ESPACEMENTS MINIMALISTES
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  
  // 🔤 TYPOGRAPHIE MINIMALISTE
  typography: {
    h1: {
      fontSize: 24,
      fontWeight: '600',
      letterSpacing: 0.5
    },
    h2: {
      fontSize: 20,
      fontWeight: '600',
      letterSpacing: 0.3
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      letterSpacing: 0.2
    }
  },
  
  // 🎯 COMPOSANTS MINIMALISTES
  components: {
    card: {
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      elevation: 0,
      shadowOpacity: 0
    },
    button: {
      borderRadius: 8,
      paddingVertical: 16,
      paddingHorizontal: 24,
      elevation: 0,
      shadowOpacity: 0
    },
    input: {
      borderRadius: 8,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 16
    }
  }
};

// 🎨 STYLES COMMUNS ORANGE CAROTTE
export const commonStyles = {
  // Header minimaliste blanc
  headerMinimal: {
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    elevation: 0,
    shadowOpacity: 0
  },
  
  // Bouton principal orange
  buttonPrimary: {
    backgroundColor: THEME.colors.primary,
    ...THEME.components.button
  },
  
  // Carte minimaliste
  cardMinimal: {
    backgroundColor: THEME.colors.background,
    borderColor: THEME.colors.border,
    ...THEME.components.card
  },
  
  // Texte titre
  titleText: {
    color: THEME.colors.textPrimary,
    ...THEME.typography.h1
  },
  
  // Texte bouton
  buttonText: {
    color: THEME.colors.background,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3
  }
};