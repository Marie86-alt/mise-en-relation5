// components/ProfileCardSkeleton.tsx
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const cardWidth = width - 32; // 16px margin de chaque côté

export default function ProfileCardSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      {/* Avatar skeleton */}
      <View style={styles.skeletonAvatar} />
      
      <View style={styles.skeletonContent}>
        {/* Nom skeleton */}
        <View style={styles.skeletonNameLong} />
        <View style={styles.skeletonNameShort} />
        
        {/* Infos skeleton */}
        <View style={styles.skeletonInfo} />
        <View style={styles.skeletonInfo} />
        
        {/* Étoiles skeleton */}
        <View style={styles.skeletonStars} />
        
        {/* Prix skeleton */}
        <View style={styles.skeletonPrice} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonCard: {
    width: cardWidth,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  skeletonAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    marginRight: 16,
  },

  skeletonContent: {
    flex: 1,
    gap: 8,
  },

  skeletonNameLong: {
    height: 18,
    backgroundColor: '#f0f0f0',
    borderRadius: 9,
    width: '80%',
  },

  skeletonNameShort: {
    height: 14,
    backgroundColor: '#f0f0f0',
    borderRadius: 7,
    width: '60%',
  },

  skeletonInfo: {
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    width: '70%',
  },

  skeletonStars: {
    height: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    width: '50%',
  },

  skeletonPrice: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    width: '40%',
  },
});