// Fichier: constants/Colors.ts

// 🎯 On définit notre nouvelle couleur principale "orange carotte"
const primaryColor = '#e67e22'; // Un orange qui correspond bien
const tintColorLight = primaryColor; // On utilise l'orange comme couleur de "teinte"
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#ffffff', // 🎯 On s'assure que le fond est bien blanc pur
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    
    // ✅ On ajoute des couleurs sémantiques pour notre application
    primary: primaryColor,
    success: '#27ae60', // On garde le vert pour les succès
    danger: '#e74c3c',   // Un rouge pour les erreurs/déconnexion
    grey: '#bdc3c7',     // Un gris pour les éléments inactifs
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,

    // ✅ On ajoute les mêmes couleurs pour le mode sombre
    primary: primaryColor,
    success: '#27ae60',
    danger: '#e74c3c',
    grey: '#7f8c8d',
  },
};