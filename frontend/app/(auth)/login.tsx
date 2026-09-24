// app/(auth)/login.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';
import ErrorService from '@/src/services/errorService';
import type { ThemeColors } from '@/constants/themes';

export default function LoginScreen() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { signIn, resetPassword, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/(tabs)');
    }
  }, [user, authLoading, router]);

  const busy = isConnecting || isResetting;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.error('Saisissez votre adresse e-mail et votre mot de passe.', 'Champs requis');
      return;
    }

    setIsConnecting(true);
    try {
      await signIn(email.trim(), password);
    } catch (error: any) {
      ErrorService.logError('LOGIN_ERROR', error?.message ?? 'Login failed', error?.code, 'error');
      toast.error(ErrorService.handleFirebaseError(error), 'Connexion impossible');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.info('Saisissez votre adresse e-mail ci-dessus, puis appuyez de nouveau sur « Mot de passe oublié ? ».', 'Adresse e-mail requise');
      return;
    }

    const messageEnvoye = `Si un compte existe pour ${trimmed}, un lien de réinitialisation vient de lui être envoyé. Pensez à vérifier vos courriers indésirables.`;
    setIsResetting(true);
    try {
      await resetPassword(trimmed);
      toast.success(messageEnvoye, 'E-mail envoyé');
    } catch (error: any) {
      ErrorService.logError('RESET_PASSWORD_ERROR', error?.message ?? 'Reset failed', error?.code, 'warning');
      if (error?.code === 'auth/user-not-found') {
        // Ne pas révéler l'existence ou non d'un compte
        toast.success(messageEnvoye, 'E-mail envoyé');
      } else {
        toast.error(ErrorService.handleFirebaseError(error), 'Envoi impossible');
      }
    } finally {
      setIsResetting(false);
    }
  };

  if (authLoading || user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>Retrouvez votre compte</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse e-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={!busy}
                accessibilityLabel="Adresse e-mail"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Votre mot de passe"
                  placeholderTextColor={theme.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  textContentType="password"
                  editable={!busy}
                  onSubmitEditing={handleLogin}
                  returnKeyType="go"
                  accessibilityLabel="Mot de passe"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={theme.textSecondary} />
                </Pressable>
              </View>

              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={busy}
                style={styles.forgotButton}
                accessibilityRole="button"
              >
                <Text style={styles.forgotText}>{isResetting ? 'Envoi en cours…' : 'Mot de passe oublié ?'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, busy && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={busy}
              accessibilityRole="button"
            >
              {isConnecting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Se connecter</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')} disabled={busy} accessibilityRole="link">
              <Text style={styles.signupLink}>Créer un compte</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    header: { alignItems: 'center', marginBottom: 32 },
    title: { fontSize: 32, fontWeight: 'bold', color: theme.text },
    subtitle: { fontSize: 16, color: theme.textSecondary, marginTop: 8 },
    form: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 8 },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 15,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.background,
      minHeight: 48,
    },
    passwordRow: { flexDirection: 'row', alignItems: 'center' },
    passwordInput: { flex: 1, paddingRight: 48 },
    eyeButton: {
      position: 'absolute',
      right: 4,
      height: 48,
      width: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    forgotButton: { alignSelf: 'flex-end', marginTop: 10, paddingVertical: 6 },
    forgotText: { color: theme.primary, fontSize: 15, fontWeight: '600' },
    loginButton: {
      backgroundColor: theme.primary,
      paddingVertical: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 4,
      minHeight: 52,
      justifyContent: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    loginButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
    footer: { alignItems: 'center', marginTop: 30 },
    footerText: { color: theme.textSecondary, fontSize: 16, marginBottom: 10 },
    signupLink: { color: theme.primary, fontWeight: 'bold', fontSize: 16, paddingVertical: 6 },
  });
