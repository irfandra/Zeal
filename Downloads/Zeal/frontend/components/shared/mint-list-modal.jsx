import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

export default function MintListModal({ visible = true, onClose, onConfirm }) {
  const [date, setDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (d) => {
    if (!d) return null;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleDateChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      {}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      {}
      <View style={styles.centeredView} pointerEvents="box-none">
        <View style={styles.card}>

          {}
          <Text style={styles.title}>List Your Collections to Marketplace ?</Text>

          {}
          <Text style={styles.bodyText}>
            Once the collection is listed, all items will be minted, collections cannot be
            modified, and QR code for label, certificate, and NFT will be generated..
          </Text>

          {}
          <Text style={[styles.bodyText, { marginTop: 12, textAlign: 'justify' }]}> 
            Define a sales time frame for the collection. When the time frame ends, the
            collection will no longer be available for sale, and any unsold NFTs will be
            automatically burned.
          </Text>

          {}
          <Text style={styles.timeFrameLabel}>Time Frame</Text>

          {}
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={date ? styles.dateText : styles.datePlaceholder}>
              {date ? formatDate(date) : 'Select Date'}
            </Text>
            <Ionicons name="calendar-outline" size={24} color="#555" />
          </TouchableOpacity>

          {}
          {showPicker && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {}
          <TouchableOpacity
            style={styles.mintButton}
            onPress={() => onConfirm && onConfirm(date)}
            activeOpacity={0.85}
          >
            <Text style={styles.mintButtonText}>Mint &amp; List</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    width: '88%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 14,
    lineHeight: 30,
  },

  bodyText: {
    fontSize: 14.5,
    color: '#333',
    lineHeight: 22,
  },

  timeFrameLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginTop: 22,
    marginBottom: 10,
  },

  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  datePlaceholder: {
    fontSize: 15,
    color: '#aaa',
  },
  dateText: {
    fontSize: 15,
    color: '#111',
    fontWeight: '600',
  },

  mintButton: {
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  mintButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
