import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Landing() {
  // Animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const logoSlide = useRef(new Animated.Value(-40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation séquentielle au démarrage
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoSlide, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(200, [
        Animated.timing(badgeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(statsAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [logoAnim, logoSlide, badgeAnim, fadeAnim, slideAnim, statsAnim]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" translucent />
      <ImageBackground
        source={require('../assets/images/hero-care.png')}
        style={styles.bg}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <SafeAreaView style={styles.safe}>
          <View style={styles.content}>
            {/* NOM DE L'APPLICATION BIEN EN RELIEF */}
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  opacity: logoAnim,
                  transform: [{ translateY: logoSlide }],
                },
              ]}
            >
              <Text style={styles.siteName}>
                <Text style={styles.siteNameAccent}>A La Case Nout Gramoun</Text>
                
              </Text>
            </Animated.View>


            {/* Titre principal animé */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <Text style={styles.title}>
                De l&apos;aide{' '}
                <Text style={styles.titleHighlight}>bienveillante</Text>,{'\n'}
                près de vous
              </Text>
            </Animated.View>

            {/* Sous-titre animé */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <Text style={styles.subtitle}>
                Trouvez un aidant de confiance en quelques minutes
              </Text>
            </Animated.View>

            {/* Boutons animés */}
            <Animated.View
              style={[
                styles.actions,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity style={styles.primary} activeOpacity={0.8}>
                  <Text style={styles.primaryTxt}>Se connecter</Text>
                </TouchableOpacity>
              </Link>
              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity style={styles.secondary} activeOpacity={0.7}>
                  <Text style={styles.secondaryTxt}>Créer un compte</Text>
                </TouchableOpacity>
              </Link>
            </Animated.View>

            {/* Texte de confiance */}
            <Animated.View
              style={[
                styles.trustContainer,
                { opacity: fadeAnim },
              ]}
            >
              <Text style={styles.trustText}>
                ✓ Aidants vérifiés et formés  • ✓ Paiement sécurisé
              </Text>
            </Animated.View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  safe: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
    gap: 16,
  },

  /* Branding du nom */
  logoContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  siteName: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 1.5,
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 4 },
    textShadowRadius: 12,
    marginBottom: 0,
  },
  siteNameAccent: {
    color: '#FF6B35',
    fontSize: 34,
    letterSpacing: 2,
    textShadowColor: '#FFDAB9',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  siteNameSub: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: 1.5,
  },

  /* Badge */
  badgeContainer: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  badge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  /* Titre principal */
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  titleHighlight: {
    color: '#fff',
  },

  /* Sous-titre */
  subtitle: {
    color: '#e5e7eb',
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 22,
  },

  /* Stats (si utilisée plus tard) */
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFDAB9',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },

  /* Boutons d'action */
  actions: { gap: 12 },
  primary: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  secondary: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  secondaryTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },

  /* Texte de confiance */
  trustContainer: {
    marginTop: 8,
  },
  trustText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
