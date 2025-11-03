// components/AvisDisplay.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { avisService, Avis, AvisStats } from '../src/services/firebase/avisService';
import { Colors } from '../constants/Colors';

interface AvisDisplayProps {
  aidantId: string;
  showTitle?: boolean;
  maxAvis?: number;
}

export default function AvisDisplay({
  aidantId,
  showTitle = true,
  maxAvis = 5
}: AvisDisplayProps) {
  const [avis, setAvis] = useState<Avis[]>([]);
  const [stats, setStats] = useState<AvisStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);

  const loadAvis = useCallback(async () => {
    try {
      setLoading(true);

      const [avisList, avisStats] = await Promise.all([
        avisService.getAvisAidant(aidantId, showMore ? 20 : maxAvis),
        avisService.getAvisStats(aidantId)
      ]);

      setAvis(avisList);
      setStats(avisStats);

      console.log('📖 Avis chargés:', {
        nombre: avisList.length,
        moyenne: avisStats.moyenneRating
      });

    } catch (error) {
      console.error('❌ Erreur chargement avis:', error);
    } finally {
      setLoading(false);
    }
  }, [aidantId, showMore, maxAvis]);

  useEffect(() => {
    loadAvis();
  }, [loadAvis]);

  const renderStars = (rating: number, size: number = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text
            key={star}
            style={[
              styles.star,
              { fontSize: size },
              star <= rating ? styles.starFilled : styles.starEmpty
            ]}
          >
            ★
          </Text>
        ))}
      </View>
    );
  };

  const renderAvis = ({ item }: { item: Avis }) => {
    const avisDate = item.createdAt?.toDate?.() || new Date();
    const dateFormatee = avisDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return (
      <View style={styles.avisCard}>
        <View style={styles.avisHeader}>
          <View style={styles.avisUserInfo}>
            <Text style={styles.clientName}>
              {item.clientName || 'Client anonyme'}
            </Text>
            <Text style={styles.avisDate}>{dateFormatee}</Text>
          </View>
          {renderStars(item.rating, 14)}
        </View>

        <Text style={styles.avisComment}>{item.comment}</Text>

        <View style={styles.avisMetadata}>
          <Text style={styles.serviceInfo}>
            {item.secteur} • {item.dureeService}h • {item.montantService}€
          </Text>
        </View>
      </View>
    );
  };

  const renderStats = () => {
    if (!stats || stats.totalAvis === 0) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsHeader}>
          <View style={styles.ratingOverview}>
            {renderStars(Math.round(stats.moyenneRating), 20)}
            <Text style={styles.averageRating}>
              {stats.moyenneRating.toFixed(1)}/5
            </Text>
            <Text style={styles.totalReviews}>
              ({stats.totalAvis} avis)
            </Text>
          </View>
        </View>

        <View style={styles.ratingDistribution}>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.repartition[rating] || 0;
            const percentage = stats.totalAvis > 0 ? (count / stats.totalAvis) * 100 : 0;

            return (
              <View key={rating} style={styles.distributionRow}>
                <Text style={styles.distributionRating}>{rating}★</Text>
                <View style={styles.distributionBar}>
                  <View
                    style={[
                      styles.distributionFill,
                      { width: `${percentage}%` }
                    ]}
                  />
                </View>
                <Text style={styles.distributionCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Chargement des avis...</Text>
      </View>
    );
  }

  if (!stats || stats.totalAvis === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucun avis pour le moment</Text>
        <Text style={styles.emptySubtext}>
          Soyez le premier à laisser un avis après votre service !
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showTitle && (
        <Text style={styles.sectionTitle}>⭐ Avis clients ({stats.totalAvis})</Text>
      )}

      {renderStats()}

      <FlatList
        data={avis}
        renderItem={renderAvis}
        keyExtractor={(item) => item.id || ''}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.avisList}
        ListFooterComponent={
          stats.totalAvis > maxAvis && !showMore ? (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowMore(true)}
            >
              <Text style={styles.showMoreText}>
                Voir tous les avis ({stats.totalAvis})
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    paddingHorizontal: 16,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: 10,
    color: '#687076',
    fontSize: 14,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#687076',
    textAlign: 'center',
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },

  // STATS
  statsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
  },

  statsHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },

  ratingOverview: {
    alignItems: 'center',
  },

  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  star: {
    marginHorizontal: 1,
  },

  starFilled: {
    color: Colors.light.primary,
  },

  starEmpty: {
    color: '#e0e0e0',
  },

  averageRating: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 8,
  },

  totalReviews: {
    fontSize: 14,
    color: '#687076',
    marginTop: 4,
  },

  ratingDistribution: {
    gap: 6,
  },

  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  distributionRating: {
    fontSize: 12,
    color: '#495057',
    width: 20,
  },

  distributionBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },

  distributionFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
  },

  distributionCount: {
    fontSize: 12,
    color: '#6c757d',
    width: 20,
    textAlign: 'right',
  },

  // AVIS
  avisList: {
    paddingHorizontal: 16,
  },

  avisCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },

  avisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  avisUserInfo: {
    flex: 1,
  },

  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },

  avisDate: {
    fontSize: 12,
    color: '#9ca3af',
  },

  avisComment: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
    marginBottom: 12,
  },

  avisMetadata: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    gap: 8,
  },

  serviceInfo: {
    fontSize: 12,
    color: '#6b7280',
  },

  showMoreButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },

  showMoreText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});