// app/_layout.tsx

import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated'; // Temporairement commenté pour éviter les erreurs
import { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator, Text, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import '../firebase.config';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { applyTextInputDefaults } from '@/src/ui/applyTextInputDefaults';
import { STRIPE_CONFIG } from '@/src/config/stripe';
// import * as SplashScreen from 'expo-splash-screen'; // Plus nécessaire

// Plus de splash screen Expo - utilisation seulement de notre écran personnalisé

// Intercepter les erreurs de calculatePriceFromTimeRange pour éviter les notifications
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('calculatePriceFromTimeRange') || 
      message.includes('Durée minimum') ||
      message.includes('Duration minimum')) {
    // Ignore silencieusement ces erreurs spécifiques
    return;
  }
  originalConsoleError(...args);
};

applyTextInputDefaults();

// Composant pour l'écran de chargement personnalisé
function CustomLoadingScreen() {
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#f8f9fa',
      paddingHorizontal: 20
    }}>
      {/* Logo de l'application */}
      <Image 
        source={require('../assets/images/splash-icon.png')}
        style={{
          width: 120,
          height: 120,
          marginBottom: 30,
        }}
        resizeMode="contain"
      />

      {/* Nom de l'application */}
      <Text style={{
        fontSize: 28,
        fontWeight: '700',
        color: '#2c3e50',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 1
      }}>
        A La Case Nout Gramoun
      </Text>
      
      <Text style={{
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
        marginBottom: 40,
        fontStyle: 'italic'
      }}>
        Votre plateforme de services à domicile
      </Text>

      <ActivityIndicator size="large" color="#247ba0" />
      
      <Text style={{ 
        marginTop: 16, 
        fontSize: 16, 
        color: '#6c757d', 
        textAlign: 'center',
        fontWeight: '500'
      }}>
        Chargement...
      </Text>
    </View>
  );
}

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const seg0 = segments?.[0]; // '(auth)', '(tabs)' ou undefined pour '/'
    const inAuth = seg0 === '(auth)';
    const inTabs = seg0 === '(tabs)';
    const atLanding = seg0 === undefined;

    // LOGIQUE DE REDIRECTION SIMPLE ET FIABLE
    // Déconnecté → va sur la landing  
    if (!user && inTabs) {
      router.replace('/');
    }
    // Connecté → onglets principaux
    else if (user && (inAuth || atLanding)) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  // Utilisation du composant d'écran de chargement personnalisé
  if (loading) {
    return <CustomLoadingScreen />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="paiement" options={{ headerShown: false }} />
      <Stack.Screen name="paiement-final" options={{ headerShown: false }} />
      <Stack.Screen name="conversation" options={{ headerShown: false }} />
      <Stack.Screen name="profile-detail" options={{ headerShown: false }} />
      <Stack.Screen name="profile-list" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({ SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf') });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Délai minimum pour afficher notre écran de chargement personnalisé
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1500); // 1.5 seconde minimum

    return () => clearTimeout(timer);
  }, []);

  if (!loaded) return null;

  if (!isReady) {
    return <CustomLoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey={STRIPE_CONFIG.PUBLISHABLE_KEY}>
        <AuthProvider>
          <ThemeProvider value={DefaultTheme}>
            <RootLayoutNav />
            {/* Sur Android edge-to-edge, garde une barre lisible */}
            <StatusBar
              style={colorScheme === 'dark' ? 'light' : 'dark'}
              translucent={Platform.OS === 'android'}
            />
          </ThemeProvider>
        </AuthProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
