// components/admin/MessagesModal.tsx

import React from 'react';
import { Modal, SafeAreaView, View, Text, TouchableOpacity, ScrollView } from 'react-native';
//mport { Colors } from '@/constants/Colors';
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
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>← Fermer</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Messages de la conversation</Text>
        </View>

        <ScrollView style={{ flex: 1, padding: 12 }}>
          {messages.map((msg) => (
            <View key={msg.id} style={styles.messageCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.msgAuthor}>{msg.expediteurName}</Text>
                <Text style={styles.msgText}>{msg.texte}</Text>
                <Text style={styles.msgTime}>
                  {msg.createdAt?.toDate?.()?.toLocaleString() || 'Date inconnue'}
                </Text>
              </View>

              <TouchableOpacity style={styles.deleteMsg} onPress={() => onDeleteMessage(msg)}>
                <Text style={styles.btnTxt}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
