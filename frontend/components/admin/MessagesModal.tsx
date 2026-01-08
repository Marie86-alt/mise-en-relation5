// components/admin/MessagesModal.tsx

import React from 'react';
import {
      Modal,
      SafeAreaView,
      View,
      Text,
      TouchableOpacity,
      ScrollView,
} from 'react-native';
import type { MessageRow } from './AdminTypes';

export function MessagesModal({
      visible,
      onClose,
      messages,
      onDeleteMessage,
      styles,
}: {
      visible: boolean;
      onClose: () => void;
      messages: MessageRow[];
      onDeleteMessage: (m: MessageRow) => void;
      styles: any;
}) {
      // Calculer le nombre de messages
  const messageCount = messages.length;

  // Formater la date pour affichage lisible
  const formatDate = (date: any) => {
          try {
                    const d = date?.toDate?.() || new Date(date);
                    return d.toLocaleString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                    });
          } catch {
                    return 'Date inconnue';
          }
  };

  return (
          <Modal visible={visible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
                    {/* En-tête amélioré */}
                        <View
                                      style={{
                                                      paddingHorizontal: 16,
                                                      paddingVertical: 12,
                                                      backgroundColor: '#FFFFFF',
                                                      borderBottomWidth: 1,
                                                      borderBottomColor: '#E0E0E0',
                                      }}
                                    >
                                  <View
                                                  style={{
                                                                    flexDirection: 'row',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    marginBottom: 12,
                                                  }}
                                                >
                                              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                                                            <Text
                                                                                style={{
                                                                                                      fontSize: 16,
                                                                                                      color: '#1976D2',
                                                                                                      fontWeight: '600',
                                                                                }}
                                                                              >
                                                                            ← Fermer
                                                            </Text>
                                              </TouchableOpacity>
                                              <Text
                                                                style={{
                                                                                    fontSize: 12,
                                                                                    color: '#999',
                                                                                    fontWeight: '500',
                                                                }}
                                                              >
                                                  {messageCount} message{messageCount > 1 ? 's' : ''}
                                              </Text>
                                  </View>
                                  <Text
                                                  style={{
                                                                    fontSize: 18,
                                                                    fontWeight: 'bold',
                                                                    color: '#333',
                                                                    marginBottom: 4,
                                                  }}
                                                >
                                              💬 Conversation
                                  </Text>
                                  <Text style={{ fontSize: 12, color: '#999' }}>
                                              Affichage des messages échangés
                                  </Text>
                        </View>
                
                    {/* Liste des messages */}
                        <ScrollView
                                      style={{ flex: 1, padding: 12 }}
                                      showsVerticalScrollIndicator={true}
                                    >
                            {messageCount === 0 ? (
                                                    <View
                                                                      style={{
                                                                                          alignItems: 'center',
                                                                                          justifyContent: 'center',
                                                                                          paddingTop: 40,
                                                                      }}
                                                                    >
                                                                  <Text
                                                                                      style={{
                                                                                                            fontSize: 14,
                                                                                                            color: '#999',
                                                                                                            fontStyle: 'italic',
                                                                                          }}
                                                                                    >
                                                                                  Aucun message dans cette conversation
                                                                  </Text>
                                                    </View>
                                                  ) : (
                                                    messages.map((msg, idx) => (
                                                                      <View
                                                                                          key={msg.id}
                                                                                          style={{
                                                                                                                marginBottom: 12,
                                                                                                                paddingHorizontal: 12,
                                                                                                                paddingVertical: 10,
                                                                                                                backgroundColor: '#FFFFFF',
                                                                                                                borderRadius: 8,
                                                                                                                borderLeftWidth: 3,
                                                                                                                borderLeftColor:
                                                                                                                                        idx % 2 === 0 ? '#4CAF50' : '#FF9800',
                                                                                                                shadowColor: '#000',
                                                                                                                shadowOffset: { width: 0, height: 1 },
                                                                                                                shadowOpacity: 0.05,
                                                                                                                shadowRadius: 2,
                                                                                                                elevation: 2,
                                                                                              }}
                                                                                        >
                                                                          {/* En-tête du message */}
                                                                                      <View
                                                                                                            style={{
                                                                                                                                    flexDirection: 'row',
                                                                                                                                    alignItems: 'center',
                                                                                                                                    justifyContent: 'space-between',
                                                                                                                                    marginBottom: 6,
                                                                                                                }}
                                                                                                          >
                                                                                                        <Text
                                                                                                                                style={{
                                                                                                                                                          fontSize: 13,
                                                                                                                                                          fontWeight: 'bold',
                                                                                                                                                          color: '#333',
                                                                                                                                                          flex: 1,
                                                                                                                                    }}
                                                                                                                              >
                                                                                                                            👤 {msg.expediteurName || 'Utilisateur inconnu'}
                                                                                                            </Text>
                                                                                                        <TouchableOpacity
                                                                                                                                style={{
                                                                                                                                                          paddingHorizontal: 8,
                                                                                                                                                          paddingVertical: 4,
                                                                                                                                                          backgroundColor: '#FFEBEE',
                                                                                                                                                          borderRadius: 4,
                                                                                                                                    }}
                                                                                                                                onPress={() => onDeleteMessage(msg)}
                                                                                                                              >
                                                                                                                            <Text style={{ fontSize: 14 }}>🗑️</Text>
                                                                                                            </TouchableOpacity>
                                                                                          </View>
                                                                      
                                                                          {/* Contenu du message */}
                                                                                      <Text
                                                                                                            style={{
                                                                                                                                    fontSize: 14,
                                                                                                                                    color: '#555',
                                                                                                                                    lineHeight: 20,
                                                                                                                                    marginBottom: 8,
                                                                                                                }}
                                                                                                          >
                                                                                          {msg.texte}
                                                                                          </Text>
                                                                      
                                                                          {/* Footer avec date/heure */}
                                                                                      <Text
                                                                                                            style={{
                                                                                                                                    fontSize: 11,
                                                                                                                                    color: '#AAA',
                                                                                                                                    textAlign: 'right',
                                                                                                                                    fontStyle: 'italic',
                                                                                                                }}
                                                                                                          >
                                                                                                        🕐 {formatDate(msg.createdAt)}
                                                                                          </Text>
                                                                      </View>
                                                                    ))
                                                  )}
                        
                            {/* Espacement en bas */}
                                  <View style={{ height: 16 }} />
                        </ScrollView>
                </SafeAreaView>
          </Modal>
        );
}
