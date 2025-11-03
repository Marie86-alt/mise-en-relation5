import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  
  ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { profilesService } from '@/src/services/firebase/profile';
import { Colors } from '@/constants/Colors';
import ProfileCardSkeleton from '@/components/ProfileCardSkeleton';

// Ce type correspond aux données de la collection 'users'
type Profile = {
  id: string;
  displayName: string;
  photo?: string;
  secteur?: string;
  experience?: number;
  tarifHeure?: number;
  averageRating?: number;
  totalReviews?: number;
  isActive?: boolean;
  description?: string;
  genre?: string;
  ville?: string;
  jour?: string; // Peut être différent de la recherche, à gérer
  horaires?: { debut: string; fin: string };
};

export default function ProfileListScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const params = useLocalSearchParams();
  const { 
    secteur, jour, heureDebut, heureFin, etatCivilPersonne, preferenceAidant 
  } = params;

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const searchCriteria = {
        secteur: secteur as string,
        jour: jour as string,
        heureDebut: heureDebut as string,
        heureFin: heureFin as string,
        etatCivil: etatCivilPersonne as string,
        preferenceAidant: preferenceAidant as string
      };
      const firebaseProfiles = await profilesService.searchProfiles(searchCriteria);
      setProfiles(firebaseProfiles as Profile[]);
    } catch (err: any) {
      setError(`Erreur lors du chargement : ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [secteur, jour, heureDebut, heureFin, etatCivilPersonne, preferenceAidant]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const renderStars = (note: number = 0) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={i <= note ? styles.star : styles.emptyStar}>★</Text>
      );
    }
    return stars;
  };

  const handleContactPress = (profile: Profile) => {
    router.push({
      pathname: '/profile-detail',
      params: { 
        profileId: profile.id, 
        secteur: secteur as string,
        jour: jour as string,
        heureDebut: heureDebut as string,
        heureFin: heureFin as string,
      }
    });
  };

  // Fonction pour obtenir les initiales
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };
  const renderProfile = ({ item }: { item: Profile }) => (
    <TouchableOpacity 
      style={styles.profileCard}
      onPress={() => handleContactPress(item)}
    >
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{getInitials(item.displayName)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{item.displayName}</Text>
          <Text style={styles.profileSector}>{item.secteur}</Text>
          <Text style={styles.profileExperience}>{item.experience || 0} ans d&apos;expérience</Text>
        </View>
        <View style={styles.profileRight}>
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>{renderStars(item.averageRating)}</View>
            <Text style={styles.ratingText}>
              {item.averageRating ? `${item.averageRating} (${item.totalReviews || 0})` : 'Nouveau'}
            </Text>
          </View>
          <Text style={styles.profileTarif}>{item.tarifHeure || 'N/A'}€/h</Text>
          {item.isActive !== false && (
            <View style={[styles.statusBadge, styles.disponible]}>
              <Text style={[styles.statusText, styles.disponibleText]}>Disponible</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.profileDescription} numberOfLines={2}>{item.description}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => {
              try {
                router.replace('/(tabs)');
              } catch (error) {
                console.error('Erreur navigation nouvelle recherche:', error);
              }
            }}>
                <Text style={styles.backButtonText}>← Nouvelle recherche</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Aidants disponibles</Text>
            <Text style={styles.resultCount}>Recherche en cours...</Text>
        </View>
        <ScrollView contentContainerStyle={styles.listContainer}>
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfiles}>
            <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
              try {
                router.replace('/(tabs)');
              } catch (error) {
                console.error('Erreur navigation nouvelle recherche:', error);
              }
            }}>
          <Text style={styles.backButtonText}>← Nouvelle recherche</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aidants disponibles</Text>
        <Text style={styles.resultCount}>{profiles.length} profil(s) trouvé(s)</Text>
      </View>

      <FlatList
        data={profiles}
        renderItem={renderProfile}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Aucun profil trouvé</Text>
            <Text style={styles.emptyText}>
              Aucun aidant ne correspond à vos critères. Essayez d&apos;élargir votre recherche.
            </Text>
            <TouchableOpacity style={styles.newSearchButton} onPress={() => {
              try {
                router.replace('/(tabs)');
              } catch (error) {
                console.error('Erreur navigation nouvelle recherche:', error);
              }
            }}>
              <Text style={styles.newSearchButtonText}>Modifier la recherche</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  backButton: { marginBottom: 10 },
  backButtonText: { color: Colors.light.primary, fontSize: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  resultCount: { color: '#6c757d', fontSize: 14, marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: Colors.light.danger, textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  listContainer: { padding: 15 },
  profileCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#f0f0f0' },
  profileHeader: { flexDirection: 'row', marginBottom: 10 },
  profileAvatar: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    marginRight: 15,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.light.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileAvatarText: { 
    color: Colors.light.primary, 
    fontSize: 20, 
    fontWeight: '900', 
    letterSpacing: 1 
  },
  profileInfo: { flex: 1, justifyContent: 'center' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  profileSector: { fontSize: 14, color: Colors.light.primary, fontWeight: '500' },
  profileExperience: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  profileSchedule: { fontSize: 12, color: '#6c757d', fontWeight: '500', marginTop: 2 },
  profileRight: { alignItems: 'flex-end' },
  ratingContainer: { alignItems: 'flex-end', marginBottom: 5 },
  starsContainer: { flexDirection: 'row' },
  star: { color: '#f39c12', fontSize: 14 },
  emptyStar: { color: '#dee2e6', fontSize: 14 },
  ratingText: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  profileTarif: { fontSize: 16, fontWeight: 'bold', color: Colors.light.success, marginBottom: 5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  disponible: { backgroundColor: '#d4edda' },
  indisponible: { backgroundColor: '#f8d7da' },
  statusText: { fontSize: 12, fontWeight: '500' },
  disponibleText: { color: '#155724' },
  indisponibleText: { color: '#721c24' },
  profileDescription: { fontSize: 14, color: '#6c757d', lineHeight: 20 },
  emptyContainer: { alignItems: 'center', marginTop: 50, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#6c757d', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#6c757d', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  newSearchButton: { backgroundColor: Colors.light.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  newSearchButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
});