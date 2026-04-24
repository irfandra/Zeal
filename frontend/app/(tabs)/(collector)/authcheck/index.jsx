
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActionSheetIOS, Platform,
  Modal, TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera } from 'expo-camera';
import ItemDetailCard from '../../../../components/card/ItemDetailCard';

export default function AuthCheckPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [selectedItem, setSelectedItem] = useState(null);
  const [labelScanned, setLabelScanned] = useState(false);
  const [certScanned,  setCertScanned]  = useState(false);
  const [result,       setResult]       = useState(null);
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [manualInputType, setManualInputType] = useState('label');
  const [manualInputValue, setManualInputValue] = useState('');

  const canCheck = selectedItem && labelScanned && certScanned;

  useFocusEffect(
    useCallback(() => {
      if (params.selectedItem) {
        try {
          const item = JSON.parse(decodeURIComponent(params.selectedItem));
          setSelectedItem(item);
        } catch {}
      }
      if (params.labelScanned === 'true')       setLabelScanned(true);
      if (params.certificateScanned === 'true') setCertScanned(true);
    }, [params.selectedItem, params.labelScanned, params.certificateScanned])
  );

  const decodeQRFromUri = async (uri, type) => {
    try {
      const decoded = await Camera.scanFromURLAsync(uri);
      if (!decoded || decoded.length === 0) {
        Alert.alert('No QR Found', 'Could not detect a QR code. Try a clearer image.');
        return;
      }
      validateQR(decoded[0].data, type);
    } catch {
      Alert.alert('Error', 'Failed to read the image. Please try again.');
    }
  };

  const validateQR = (data, type) => {
    if (!selectedItem) {
      Alert.alert('Select Item First', 'Please select an NFT item before scanning.');
      return;
    }
    const expected = type === 'label' ? selectedItem.labelQR : selectedItem.certificateQR;
    if (data === expected) {
      if (type === 'label')       setLabelScanned(true);
      if (type === 'certificate') setCertScanned(true);
    } else {
      Alert.alert('Invalid QR Code', 'This QR does not match the selected item.',
        [{ text: 'Try Again', style: 'cancel' }]
      );
    }
  };

  const pickFromGallery = async (type) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, quality: 1,
    });
    if (!result.canceled) await decodeQRFromUri(result.assets[0].uri, type);
  };

  const pickFromFiles = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image}
      <View style={styles.stepSection}>
        <View style={styles.stepRow}>
          <View style={[styles.stepCircle, selectedItem && styles.stepCircleDone]}>
            {selectedItem
              ? <Ionicons name="checkmark" size={16} color="#fff" />
              : <Text style={styles.stepNumber}>1</Text>
            }
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select NFT Items</Text>

            {}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(tabs)/(collector)/authcheck/selectnft')}
            >
              <Ionicons
                name={selectedItem ? 'swap-horizontal-outline' : 'add-circle-outline'}
                size={16}
                color="#fff"
              />
              <Text style={styles.actionBtnText}>
                {selectedItem ? 'Change Item' : '+ Select NFT'}
              </Text>
            </TouchableOpacity>

            {}
            {selectedItem && (
              <View style={styles.selectedCardRow}>
                <ItemDetailCard
                  item={selectedItem}
                  showStatus={!!selectedItem.status}
                  cardWidth={160}
                />
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.connector} />
      <ScanStep number={2} title="Scan Product Labels"       type="label"       scanned={labelScanned} label="Label"       />
      <View style={styles.connector} />
      <ScanStep number={3} title="Scan Physical Certificate" type="certificate" scanned={certScanned}  label="Certificate" />
      <View style={styles.connector} />

      {}
      <View style={styles.stepSection}>
        <View style={styles.stepRow}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNumber}>4</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Finish & Check Result</Text>
            <TouchableOpacity
              style={[styles.actionBtn, !canCheck && styles.actionBtnDisabled]}
              onPress={canCheck ? handleCheckResult : null}
              activeOpacity={canCheck ? 0.85 : 1}
            >
              <Text style={styles.actionBtnText}>Check Result</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={{ height: 60 }} />

      <Modal
        visible={manualInputVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualInputVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.manualModalCard}>
            <Text style={styles.manualModalTitle}>
              Input {manualInputType === 'certificate' ? 'Certificate' : 'Label'} QR String
            </Text>
            <Text style={styles.manualModalHint}>
              Paste the full QR payload text from your physical item.
            </Text>
            <TextInput
              style={styles.manualInput}
              value={manualInputValue}
              onChangeText={setManualInputValue}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              placeholder="Paste QR payload here"
              placeholderTextColor="#999"
            />

            <View style={styles.manualBtnRow}>
              <TouchableOpacity
                style={[styles.manualBtn, styles.manualBtnSecondary]}
                onPress={() => setManualInputVisible(false)}
              >
                <Text style={styles.manualBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.manualBtn, styles.manualBtnPrimary]} onPress={submitManualInput}>
                <Text style={styles.manualBtnPrimaryText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#fff' },
  scroll:     { paddingHorizontal: 20, paddingTop: 10 },
  pageTitle:  { fontSize: 28, fontWeight: '700', color: '#111', marginBottom: 24 },

  stepSection:    { marginBottom: 0 },
  stepRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  stepCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#111', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  stepCircleDone: { backgroundColor: '#27AE60' },
  stepNumber:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  stepContent:    { flex: 1, paddingBottom: 16, gap: 10 },
  stepTitle:      { fontSize: 16, fontWeight: '700', color: '#111', marginTop: 8 },
  connector: {
    width: 2, height: 20, backgroundColor: '#ddd',
    marginLeft: 18, marginVertical: 4,
  },

  btnRow:            { flexDirection: 'row', gap: 8 },
  actionBtn: {
    backgroundColor: '#111', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: 8,
  },
  actionBtnHalf:     { flex: 1 },
  actionBtnOutline:  { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd' },
  actionBtnDisabled: { backgroundColor: '#aaa' },
  actionBtnText:     { color: '#fff', fontSize: 14, fontWeight: '700' },
  uploadHint:        { fontSize: 11, color: '#aaa', marginTop: -4 },

  scannedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  scannedText: { fontSize: 13, fontWeight: '600' },

  selectedCardRow: {
    flexDirection: 'row',
  },

  resultCardWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  resultContainer: {
    flex: 1, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16,
  },
  resultIcon: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  resultTitle:    { fontSize: 28, fontWeight: '900', color: '#111' },
  resultSubtitle: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22 },
  resetBtn: {
    width: '100%', backgroundColor: '#111', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  resetBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  manualModalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  manualModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  manualModalHint: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    minHeight: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111',
    textAlignVertical: 'top',
  },
  manualBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manualBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualBtnPrimary: {
    backgroundColor: '#111',
  },
  manualBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  manualBtnPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  manualBtnSecondaryText: {
    color: '#111',
    fontSize: 13,
    fontWeight: '700',
  },
});