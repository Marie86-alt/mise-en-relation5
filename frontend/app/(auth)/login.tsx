import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Colors } from '@/constants/Colors';


export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const { signIn, user, loading: authLoading } = useAuth() as any;
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/(tabs)');
    }
  }, [user, authLoading, router]);

  const handleLogin = async () => {
     if (!email.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez entrer votre email et votre mot de passe.');
      return;
    }
    setIsConnecting(true);
    try {
      await signIn(email.trim(), password);
    } catch (error: any) { // ✅ On type 'error' et on l'utilise ci-dessous
      console.error('Erreur de connexion détaillée:', error); // Log pour le débogage
      Alert.alert(
        'Erreur de connexion',
        // On peut afficher un message plus générique à l'utilisateur
        'L\'email ou le mot de passe est incorrect. Veuillez réessayer.'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSignupPress = () => {
    router.push('/(auth)/signup');
  };

  if (authLoading || user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <View style={styles.innerContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>Retrouvez votre compte</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isConnecting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                style={styles.input}
                placeholder="Votre mot de passe"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isConnecting}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isConnecting && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isConnecting}
            >
              {isConnecting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.loginButtonText}>Se connecter</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <TouchableOpacity onPress={handleSignupPress} disabled={isConnecting}>
              <Text style={styles.signupLink}>Créer un compte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 40 
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#2c3e50' 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#6c757d', 
    marginTop: 8 
  },
  form: { 
    backgroundColor: '#ffffff', 
    borderRadius: 12, 
    padding: 25, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5 
  },
  inputGroup: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#34495e', 
    marginBottom: 8 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#dfe6e9', 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    paddingVertical: Platform.OS === 'ios' ? 14 : 10, 
    fontSize: 16,
    color: '#11181C'
  },
  loginButton: { 
    backgroundColor: Colors.light.primary, 
    paddingVertical: 15, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10 
  },
  buttonDisabled: { 
    backgroundColor: '#a4b0be' 
  },
  loginButtonText: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  footer: { 
    alignItems: 'center', 
    marginTop: 30 
  },
  footerText: { 
    color: '#6c757d', 
    fontSize: 16,
    marginBottom: 10
  },
  signupLink: { 
    color: Colors.light.primary, 
    fontWeight: 'bold',
    fontSize: 16
  },
});