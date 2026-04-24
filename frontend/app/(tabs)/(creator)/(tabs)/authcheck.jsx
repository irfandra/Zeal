import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera } from 'expo-camera';
import { apiRequest } from '@/services/apiClient';
import { collectionService } from '@/services/collectionService';

const normalizeItemSerial = (value) => String(value || '').trim().replace(/^#/, '');

const toDisplayItemId = (value) => {
  const safeValue = String(value || '').trim();
  if (!safeValue) {
    return '#ITEM';
  }

  return safeValue.startsWith('#') ? safeValue : `#${safeValue}`;
};

export default function AuthenticityCheckScreen() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [labelScanned, setLabelScanned] = useState(false);
  const [certScanned, setCertScanned] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [loadItemsError, setLoadItemsError] = useState('');
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [manualInputType, setManualInputType] = useState('label');
  const [manualInputValue, setManualInputValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const canCheck = useMemo(
    () => Boolean(selectedItem && labelScanned && certScanned),
    [selectedItem, labelScanned, certScanned]
  );

  const canSubmitCheck = canCheck && !isVerifying;

  const loadCreatorAuthItems = useCallback(async () => {
    setIsLoadingItems(true);
    setLoadItemsError('');

    try {
      const collections = await collectionService.getCollectionsForCreatorHome().catch(() => []);
      const safeCollections = Array.isArray(collections) ? collections : [];

      if (safeCollections.length === 0) {
        setAvailableItems([]);
        return;
      }

      const groupedProducts = await Promise.all(
        safeCollections.map(async (collection) => {
          const products = await collectionService.getProductsByCollection(collection.id).catch(() => []);
          return (Array.isArray(products) ? products : []).map((product) => ({
            ...product,
            collection: product?.collection || collection?.name || collection?.title || '-',
            brand: product?.brand || collection?.brand || '-',
            brandLogo: String(product?.brandLogo || collection?.brandLogo || '').trim(),
          }));
        })
      );

      const productMap = new Map();
      groupedProducts
        .flat()
        .forEach((product) => {
          const key = String(product?.id || '').trim();
          if (!key || productMap.has(key)) {
            return;
          }
          productMap.set(key, product);
        });

      const uniqueProducts = Array.from(productMap.values());

      if (uniqueProducts.length === 0) {
        setAvailableItems([]);
        return;
      }

      const groupedItems = await Promise.all(
        uniqueProducts.map(async (product) => {
          const detail = await collectionService.getProductById(product.id, {
            includeOnlyPurchasableItems: false,
          }).catch(() => null);
          const purchaseItems = Array.isArray(detail?.purchaseItems) ? detail.purchaseItems : [];

          const safeProductName = String(detail?.name || product?.name || 'Product Item').trim();
          const safeCollection = String(detail?.collection || product?.collection || '-').trim();
          const safeBrand = String(detail?.brand || product?.brand || '-').trim();
          const safeBrandLogo = String(detail?.brandLogo || product?.brandLogo || '').trim();

          return purchaseItems.map((item) => {
            const serial = normalizeItemSerial(item?.itemSerial || item?.id);
            return {
              id: toDisplayItemId(item?.id || serial),
              itemSerial: serial,
              name: safeProductName,
              collection: safeCollection,
              brand: safeBrand,
              brandLogo: safeBrandLogo,
              sealStatus: String(item?.sealStatus || '').trim().toUpperCase(),
              labelQR: String(item?.productLabelQrCode || '').trim(),
              certificateQR: String(item?.certificateQrCode || '').trim(),
              nftQR: String(item?.nftQrCode || '').trim(),
            };
          });
        })
      );

      const uniqueItemMap = new Map();

      groupedItems
        .flat()
        .filter((item) => item.itemSerial && item.labelQR && item.certificateQR && item.sealStatus !== 'BURNED')
        .forEach((item) => {
          if (!uniqueItemMap.has(item.itemSerial)) {
            uniqueItemMap.set(item.itemSerial, item);
          }
        });

      const rows = Array.from(uniqueItemMap.values()).sort((left, right) =>
        String(left?.itemSerial || '').localeCompare(String(right?.itemSerial || ''))
      );

      setAvailableItems(rows);
    } catch (error) {
      setAvailableItems([]);
      setLoadItemsError(error?.message || 'Failed to load creator items for authenticity check.');
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    loadCreatorAuthItems();
  }, [loadCreatorAuthItems]);

  const resetAll = () => {
    setSelectedItem(null);
    setLabelScanned(false);
    setCertScanned(false);
    setManualInputVisible(false);
    setManualInputType('label');
    setManualInputValue('');
  };

  const openItemPicker = () => {
    if (isLoadingItems) {
      Alert.alert('Loading Items', 'Please wait while creator items are loading.');
      return;
    }

    if (availableItems.length === 0) {
      Alert.alert(
        'No Verifiable Items',
        loadItemsError || 'No minted product items with QR payload were found yet.'
      );
      return;
    }

    const options = ['Cancel', ...availableItems.map((item) => `${item.id} · ${item.name}`)];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index <= 0) {
            return;
          }

          const picked = availableItems[index - 1];
          setSelectedItem(picked || null);
          setLabelScanned(false);
          setCertScanned(false);
        }
      );
      return;
    }

    Alert.alert(
      'Select NFT Item',
      'Pick one item for authenticity verification.',
      [
        ...availableItems.map((item) => ({
          text: `${item.id} · ${item.name}`,
          onPress: () => {
            setSelectedItem(item);
            setLabelScanned(false);
            setCertScanned(false);
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const validateQR = (value, type) => {
    const safeValue = String(value || '').trim();
    if (!selectedItem) {
      Alert.alert('Select Item First', 'Please select an NFT item first.');
      return;
    }

    const expected = type === 'label' ? selectedItem.labelQR : selectedItem.certificateQR;
    if (safeValue === expected) {
      if (type === 'label') {
        setLabelScanned(true);
      }
      if (type === 'certificate') {
        setCertScanned(true);
      }
      return;
    }

    Alert.alert('Invalid QR String', 'The input does not match selected item QR payload.');
  };

  const decodeQRFromUri = async (uri, type) => {
    try {
      const decoded = await Camera.scanFromURLAsync(uri);
      if (!decoded || decoded.length === 0) {
        Alert.alert('No QR Found', 'Could not detect a QR code. Try a clearer image.');
        return;
      }

      validateQR(decoded[0].data, type);
    } catch {
      Alert.alert('Error', 'Failed to read the image. Please try another file.');
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
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await decodeQRFromUri(result.assets[0].uri, type);
    }
  };

  const pickFromFiles = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await decodeQRFromUri(result.assets[0].uri, type);
      }
    } catch {
      Alert.alert('Error', 'Failed to open selected file.');
    }
  };

  const openManualInput = (type) => {
    setManualInputType(type);
    setManualInputValue('');
    setManualInputVisible(true);
  };

  const handleUploadQR = (type) => {
    if (!selectedItem) {
      Alert.alert('Select Item First', 'Please select an NFT item first.');
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Choose from Gallery', 'Choose from Files', 'Input Manual String'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) pickFromGallery(type);
          if (index === 2) pickFromFiles(type);
          if (index === 3) openManualInput(type);
        }
      );
      return;
    }

    Alert.alert('Select Source', '', [
      { text: 'Gallery', onPress: () => pickFromGallery(type) },
      { text: 'Files', onPress: () => pickFromFiles(type) },
      { text: 'Input Manual String', onPress: () => openManualInput(type) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submitManualInput = () => {
    const value = String(manualInputValue || '').trim();
    if (!value) {
      Alert.alert('Manual Input', 'Please type or paste QR payload text first.');
      return;
    }

    validateQR(value, manualInputType);
    setManualInputVisible(false);
    setManualInputValue('');
  };

  const handleCheckResult = async () => {
    if (!canSubmitCheck || !selectedItem) {
      return;
    }

    const serial = normalizeItemSerial(selectedItem?.itemSerial || selectedItem?.id);
    if (!serial) {
      Alert.alert('Verification Failed', 'Selected item serial is invalid.');
      return;
    }

    setIsVerifying(true);

    try {
      const verification = await apiRequest(`/verify/serial/${encodeURIComponent(serial)}`);
      const isAuthentic = verification?.authentic !== false;
      const sealStatus = String(verification?.sealStatus || selectedItem?.sealStatus || '').trim();
      const statusSuffix = sealStatus ? `\nSeal Status: ${sealStatus}` : '';

      Alert.alert(
        isAuthentic ? 'Authenticity Verified' : 'Verification Failed',
        isAuthentic
          ? `${selectedItem.id} is authentic on ZEAL blockchain.${statusSuffix}`
          : `${selectedItem.id} could not be verified.${statusSuffix}`
      );
    } catch (error) {
      Alert.alert('Verification Failed', error?.message || 'Unable to verify this item right now.');
    } finally {
      setIsVerifying(false);
    }
  };

  const ScanStep = ({ number, title, type, scanned }) => (
    <View style={styles.stepSection}>
      <View style={styles.row}>
        <View style={[styles.circle, scanned && styles.circleDone]}>
          {scanned ? (
            <Ionicons name="checkmark" size={16} color="#fff" />
          ) : (
            <Text style={styles.circleText}>{number}</Text>
          )}
        </View>
        <View style={styles.content}>
          <Text style={styles.stepTitle}>{title}</Text>
          {!scanned && (
            <>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.halfBtn]}
                  onPress={() => Alert.alert('Camera', 'Use upload or manual input on this screen.')}
                >
                  <Ionicons name="qr-code-outline" size={16} color="#fff" />
                  <Text style={styles.buttonText}>Scan QR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.halfBtn, styles.outlineBtn]}
                  onPress={() => handleUploadQR(type)}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color="#111" />
                  <Text style={[styles.buttonText, { color: '#111' }]}>Upload QR</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, styles.outlineBtn]}
                onPress={() => openManualInput(type)}
              >
                <Ionicons name="create-outline" size={16} color="#111" />
                <Text style={[styles.buttonText, { color: '#111' }]}>Input Manual String</Text>
              </TouchableOpacity>
              <Text style={styles.uploadHint}>Upload supports Gallery & Files</Text>
            </>
          )}

          {scanned && (
            <View style={styles.scannedBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#27AE60" />
              <Text style={styles.scannedText}>Verified</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Authenticity Check</Text>

      <View style={styles.stepSection}>
        <View style={styles.row}>
          <View style={[styles.circle, selectedItem && styles.circleDone]}>
            {selectedItem ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={styles.circleText}>1</Text>
            )}
          </View>
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Select NFT Items</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={openItemPicker}>
              <Ionicons
                name={selectedItem ? 'swap-horizontal-outline' : 'add-circle-outline'}
                size={16}
                color="#fff"
              />
              <Text style={styles.buttonText}>{selectedItem ? 'Change Item' : '+ Select NFT'}</Text>
            </TouchableOpacity>

            {isLoadingItems && (
              <View style={styles.stateInfoRow}>
                <ActivityIndicator size="small" color="#111" />
                <Text style={styles.stateInfoText}>Loading creator product items...</Text>
              </View>
            )}

            {!isLoadingItems && !!loadItemsError && (
              <View style={styles.stateErrorWrap}>
                <Text style={styles.stateErrorText}>{loadItemsError}</Text>
                <TouchableOpacity style={styles.reloadBtn} onPress={loadCreatorAuthItems}>
                  <Text style={styles.reloadBtnText}>Reload</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isLoadingItems && !loadItemsError && availableItems.length === 0 && (
              <Text style={styles.stateInfoText}>No minted items with full QR payload found yet.</Text>
            )}

            {!isLoadingItems && !loadItemsError && availableItems.length > 0 && !selectedItem && (
              <Text style={styles.stateInfoText}>{availableItems.length} verifiable item(s) available.</Text>
            )}

            {selectedItem && (
              <Text style={styles.selectedItemText}>
                {selectedItem.id} · {selectedItem.name} · {selectedItem.collection}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.connector} />
      <ScanStep number={2} title="Scan Product Labels" type="label" scanned={labelScanned} />
      <View style={styles.connector} />
      <ScanStep number={3} title="Scan Physical Certificate" type="certificate" scanned={certScanned} />
      <View style={styles.connector} />

      <View style={styles.stepSection}>
        <View style={styles.row}>
          <View style={styles.circle}>
            <Text style={styles.circleText}>4</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.stepTitle}>Finish & Check Result</Text>
            <TouchableOpacity
              style={[styles.primaryButton, !canSubmitCheck && styles.disabledBtn]}
              onPress={canSubmitCheck ? handleCheckResult : null}
              activeOpacity={canSubmitCheck ? 0.85 : 1}
            >
              <Text style={styles.buttonText}>{isVerifying ? 'Verifying...' : 'Check Result'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={resetAll}>
              <Text style={styles.resetBtnText}>Reset Steps</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
            <Text style={styles.manualModalHint}>Paste the full QR payload text for verification.</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 24,
  },
  stepSection: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: '#27AE60',
  },
  circleText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingBottom: 16,
    gap: 10,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginTop: 8,
  },
  connector: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 18,
    marginVertical: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfBtn: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  outlineBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ddd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  uploadHint: {
    fontSize: 11,
    color: '#aaa',
    marginTop: -4,
  },
  selectedItemText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
    lineHeight: 18,
  },
  stateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stateInfoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  stateErrorWrap: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  stateErrorText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 18,
    fontWeight: '600',
  },
  reloadBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reloadBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  disabledBtn: {
    backgroundColor: '#aaa',
  },
  scannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  scannedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27AE60',
  },
  resetBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  resetBtnText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '700',
  },
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
