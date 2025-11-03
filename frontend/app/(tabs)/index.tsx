// Fichier: app/(tabs)/index.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { validateDate, validateTime, formatTimeToFrench, convertTimeToMinutes } from '../../src/utils/dateValidation';

export default function HomeScreen() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [secteur, setSecteur] = useState('');
  const [jour, setJour] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [showSecteurModal, setShowSecteurModal] = useState(false);
  const [etatCivilPersonne, setEtatCivilPersonne] = useState('');
  const [preferenceAidant, setPreferenceAidant] = useState('');

  // États pour les erreurs de validation
  const [jourError, setJourError] = useState('');
  const [heureDebutError, setHeureDebutError] = useState('');
  const [heureFinError, setHeureFinError] = useState('');

  const secteurs = [
    'Aide au repas',
    'Dame de compagnie',
    'Soins légers et assistance',
    'Stimulation cognitive (jeux, lecture)',
    'Accompagnement (sorties, promenades)',
    'Autre'
  ];

  // Validation de la date en temps réel
  // Remplacez cette fonction dans index.tsx
const handleJourChange = (text: string) => {
  // Supprimer tous les caractères non numériques
  let cleanedText = text.replace(/\D/g, '');
  
  // Formater automatiquement avec des barres obliques
  if (cleanedText.length >= 2) {
    cleanedText = cleanedText.substring(0, 2) + '/' + cleanedText.substring(2);
  }
  if (cleanedText.length >= 5) {
    cleanedText = cleanedText.substring(0, 5) + '/' + cleanedText.substring(5, 9);
  }
  
  setJour(cleanedText);
  
  if (cleanedText.length >= 8) {
    const validation = validateDate(cleanedText);
    setJourError(validation.error || '');
  } else if (cleanedText.length > 0) {
    setJourError('Format incomplet - utilisez JJ/MM/AAAA');
  } else {
    setJourError('');
  }
};

  // Validation et formatage de l'heure de début
  const handleHeureDebutChange = (text: string) => {
    setHeureDebut(text);
    
    if (text.length > 0) {
      const validation = validateTime(text);
      setHeureDebutError(validation.error || '');
    } else {
      setHeureDebutError('');
    }
  };

  // Formatage automatique de l'heure de début au blur
  const handleHeureDebutBlur = () => {
    if (heureDebut && !heureDebutError) {
      const formatted = formatTimeToFrench(heureDebut);
      setHeureDebut(formatted);
    }
  };

  // Validation et formatage de l'heure de fin
  const handleHeureFinChange = (text: string) => {
    setHeureFin(text);
    
    if (text.length > 0) {
      const validation = validateTime(text);
      setHeureFinError(validation.error || '');
    } else {
      setHeureFinError('');
    }
  };

  // Formatage automatique de l'heure de fin au blur
  const handleHeureFinBlur = () => {
    if (heureFin && !heureFinError) {
      const formatted = formatTimeToFrench(heureFin);
      setHeureFin(formatted);
    }
  };

  const handleSubmit = () => {
    const errors: string[] = [];

    // Validation secteur
    if (!secteur.trim()) {
      errors.push("Le secteur est obligatoire");
    }

    // Validation date
    if (!jour.trim()) {
      errors.push("La date est obligatoire");
    } else {
      const dateValidation = validateDate(jour);
      if (!dateValidation.isValid) {
        errors.push(`Date: ${dateValidation.error}`);
      }
    }

    // Validation heure début
    if (!heureDebut.trim()) {
      errors.push("L'heure de début est obligatoire");
    } else {
      const timeValidation = validateTime(heureDebut);
      if (!timeValidation.isValid) {
        errors.push(`Heure début: ${timeValidation.error}`);
      }
    }

    // Validation heure fin
    if (!heureFin.trim()) {
      errors.push("L'heure de fin est obligatoire");
    } else {
      const timeValidation = validateTime(heureFin);
      if (!timeValidation.isValid) {
        errors.push(`Heure fin: ${timeValidation.error}`);
      }
    }

    // Validation logique des heures
    if (heureDebut && heureFin && !heureDebutError && !heureFinError) {
      const startTime = convertTimeToMinutes(heureDebut);
      const endTime = convertTimeToMinutes(heureFin);
      
      if (startTime >= endTime) {
        errors.push("L'heure de fin doit être après l'heure de début");
      }
    }

    // Validation état civil
    if (!etatCivilPersonne) {
      errors.push("Veuillez sélectionner pour qui est le service");
    }

    // Validation préférence aidant
    if (!preferenceAidant) {
      errors.push("Veuillez sélectionner votre préférence d'aidant");
    }

    // Affichage des erreurs
    if (errors.length > 0) {
      Alert.alert(
        "Erreurs de validation",
        errors.join("\n\n"),
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    // Si tout est valide, continuer
    const searchParams = { 
      secteur, 
      jour, 
      heureDebut, 
      heureFin, 
      etatCivilPersonne, 
      preferenceAidant 
    };
    router.push({ pathname: './profile-list', params: searchParams });
  };

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { 
        text: 'Déconnecter', 
        style: 'destructive', 
        onPress: async () => { 
          try { 
            await (logout as any)(); 
            // Pas de navigation manuelle - laisse AuthContext._layout.tsx gérer
          } catch (error) { 
            console.error('Erreur de déconnexion:', error); 
          } 
        } 
      }
    ]);
  };

  const CheckBox = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void; }) => (
    <TouchableOpacity style={styles.checkboxContainer} onPress={onPress}>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        <Text style={styles.checkboxText}>{selected ? '✓' : ''}</Text>
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Bonjour,</Text>
            <Text style={styles.userName}>
              {(user as any)?.displayName || (user as any)?.email}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>A La Case Nout Gramoun</Text>
        <Text style={styles.subtitle}>Trouvez l&apos;aide qu&apos;il vous faut</Text>
      </View>

      <View style={styles.form}>
        {/* Secteur */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>🏷️ Secteur d&apos;aide recherché *</Text>
          <TouchableOpacity 
            style={styles.selectorButton} 
            onPress={() => setShowSecteurModal(true)}
          >
            <Text style={[
              styles.selectorButtonText, 
              !secteur && styles.placeholderText
            ]}>
              {secteur || 'Sélectionnez un secteur'}
            </Text>
            <Text style={styles.selectorArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Date avec validation */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>🗓️ Date du service *</Text>
          <TextInput 
            style={[
              styles.input, 
              jourError ? styles.inputError : {}
            ]} 
            placeholder="JJ/MM/AAAA (ex: 15/08/2025)"
            placeholderTextColor="#9CA3AF"
            value={jour} 
            onChangeText={handleJourChange}
            keyboardType="numeric"
            maxLength={10}
          />
          {jourError ? (
            <Text style={styles.errorText}>{jourError}</Text>
          ) : (
            <Text style={styles.hintText}>
              Format : jour/mois/année (ex: 15/08/2025)
            </Text>
          )}
        </View>

        {/* Horaires avec validation */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>⏱️ Horaires *</Text>
          <View style={styles.timeContainer}>
            <View style={styles.timeInputContainer}>
              <TextInput 
                style={[
                  styles.input, 
                  styles.timeInput,
                  heureDebutError ? styles.inputError : {}
                ]} 
                placeholder="10h00"
                placeholderTextColor="#9CA3AF"
                value={heureDebut} 
                onChangeText={handleHeureDebutChange}
                onBlur={handleHeureDebutBlur}
                keyboardType="numeric"
                maxLength={5}
              />
              {heureDebutError ? (
                <Text style={styles.errorTextSmall}>{heureDebutError}</Text>
              ) : null}
            </View>
            
            <Text style={styles.timeText}>à</Text>
            
            <View style={styles.timeInputContainer}>
              <TextInput 
                style={[
                  styles.input, 
                  styles.timeInput,
                  heureFinError ? styles.inputError : {}
                ]} 
                placeholder="18h00"
                placeholderTextColor="#9CA3AF"
                value={heureFin} 
                onChangeText={handleHeureFinChange}
                onBlur={handleHeureFinBlur}
                keyboardType="numeric"
                maxLength={5}
              />
              {heureFinError ? (
                <Text style={styles.errorTextSmall}>{heureFinError}</Text>
              ) : null}
            </View>
          </View>
          <Text style={styles.hintText}>
            Format : 10h00 (ou tapez juste 10 pour 10h00)
          </Text>
        </View>
        
        {/* État civil avec option Indifférent */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>👤 Pour qui est le service ? *</Text>
          <View style={styles.checkboxRow}>
            <CheckBox 
              label="Femme" 
              selected={etatCivilPersonne === 'Femme'} 
              onPress={() => setEtatCivilPersonne('Femme')} 
            />
            <CheckBox 
              label="Homme" 
              selected={etatCivilPersonne === 'Homme'} 
              onPress={() => setEtatCivilPersonne('Homme')} 
            />
            <CheckBox 
              label="Indifférent" 
              selected={etatCivilPersonne === 'Indifférent'} 
              onPress={() => setEtatCivilPersonne('Indifférent')} 
            />
          </View>
        </View>

        {/* Préférence aidant avec option Indifférent */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>🤝 Préférence de l&apos;aidant *</Text>
          <View style={styles.checkboxRow}>
            <CheckBox 
              label="Femme" 
              selected={preferenceAidant === 'Femme'} 
              onPress={() => setPreferenceAidant('Femme')} 
            />
            <CheckBox 
              label="Homme" 
              selected={preferenceAidant === 'Homme'} 
              onPress={() => setPreferenceAidant('Homme')} 
            />
            <CheckBox 
              label="Indifférent" 
              selected={preferenceAidant === 'Indifférent'} 
              onPress={() => setPreferenceAidant('Indifférent')} 
            />
          </View>
        </View>
        
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Rechercher un aidant</Text>
        </TouchableOpacity>
      </View>

      {/* Modal secteur */}
      <Modal 
        visible={showSecteurModal} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setShowSecteurModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un secteur</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton} 
                onPress={() => setShowSecteurModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList 
              data={secteurs} 
              keyExtractor={(item) => item} 
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => { 
                    setSecteur(item); 
                    setShowSecteurModal(false); 
                  }}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {secteur === item && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )} 
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// --- STYLES MISE À JOUR ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  userInfo: { flex: 1 },
  welcomeText: { fontSize: 16, color: '#6c757d' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#11181C' },
  logoutButton: { 
    backgroundColor: '#f0f2f5', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8 
  },
  logoutButtonText: { color: Colors.light.danger, fontSize: 14, fontWeight: '500' },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: Colors.light.primary, 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  subtitle: { fontSize: 16, color: '#6c757d', textAlign: 'center' },
  form: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#2c3e50', 
    marginBottom: 10 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#dee2e6', 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    paddingVertical: 12, 
    fontSize: 16, 
    backgroundColor: '#ffffff',
    color: '#11181C'
  },
  inputError: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  errorTextSmall: {
    color: '#ff4444',
    fontSize: 10,
    marginTop: 2,
  },
  hintText: {
    color: '#6c757d',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  selectorButton: { 
    borderWidth: 1, 
    borderColor: '#dee2e6', 
    borderRadius: 8, 
    paddingHorizontal: 15, 
    paddingVertical: 12, 
    backgroundColor: '#ffffff', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  selectorButtonText: { fontSize: 16, color: '#2c3e50' },
  placeholderText: { color: '#6c757d' },
  selectorArrow: { fontSize: 12, color: '#6c757d' },
  timeContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 10 
  },
  timeInputContainer: {
    flex: 1,
  },
  timeInput: { 
    flex: 1 
  },
  timeText: { 
    fontSize: 16, 
    color: '#6c757d', 
    fontWeight: '500',
    marginTop: 12, // Aligne avec les inputs
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 15,
    flexWrap: 'wrap',
  },
  checkboxContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 5 
  },
  checkbox: { 
    width: 24, 
    height: 24, 
    borderWidth: 2, 
    borderColor: '#dee2e6', 
    borderRadius: 4, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#ffffff' 
  },
  checkboxSelected: { 
    backgroundColor: Colors.light.primary, 
    borderColor: Colors.light.primary 
  },
  checkboxText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 16, color: '#2c3e50' },
  submitButton: { 
    backgroundColor: Colors.light.primary, 
    paddingVertical: 15, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10 
  },
  submitButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContainer: { 
    backgroundColor: '#ffffff', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    maxHeight: '70%' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#dee2e6' 
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  modalCloseButton: { 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    backgroundColor: '#e9ecef', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  modalCloseText: { fontSize: 16, color: '#6c757d' },
  modalOption: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f8f9fa' 
  },
  modalOptionText: { fontSize: 16, color: '#2c3e50' },
  checkmark: { fontSize: 18, color: Colors.light.success, fontWeight: 'bold' },
});