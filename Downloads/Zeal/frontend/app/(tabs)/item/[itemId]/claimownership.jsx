import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera } from 'expo-camera';
import { apiRequest } from '@/services/apiClient';
import { rackService } from '@/services/rackService';
import { useWallet } from '@/components/context/WalletContext';

const readParam = (value) => (Array.isArray(value) ? value[0] : value);

const decodeScanParam = (value) => {
  const raw = String(readParam(value) || '').trim();
  if (!raw) {
    return '';
  }

  try {
    return decodeURIComponent(raw).trim();
  } catch (_error) {
    return raw;
  }
};

const extractClaimCode = (payload) => {
  const safePayload = String(payload || '').trim();
  if (!safePayload) {
    return '';
  }

  const lower = safePayload.toLowerCase();
  if (lower.startsWith('digitalseal://label/')) {
    return safePayload.slice('digitalseal://label/'.length).trim();
  }

  const match = safePayload.match(/[?&]claimCode=([^&]+)/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]).trim();
    } catch (_error) {
      return String(match[1]).trim();
    }
  }

  return safePayload;
};

const shortPayload = (value) => {
  const safeValue = String(value || '').trim();
  if (!safeValue) {
    return '-';
  }

  if (safeValue.length <= 54) {
    return safeValue;
  }

  return `${safeValue.slice(0, 30)}...${safeValue.slice(-16)}`;
};

const isCertificatePayload = (value) => {
  const safeValue = String(value || '').trim().toLowerCase();
  return safeValue.startsWith('digitalseal://certificate/');
};

const isHexWalletAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());

const resolveTokenId = (...candidates) => {
  for (const candidate of candidates) {
    const safeValue = String(candidate ?? '').trim();
    if (/^\d+$/.test(safeValue)) {
      return safeValue;
    }
  }

  return '';
};

export default function ClaimOwnershipPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { wallet, connectWallet, watchNftInWallet } = useWallet();
  const routeItemId = decodeURIComponent(String(readParam(params.itemId) || ''));

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [labelScanned, setLabelScanned] = useState(false);
  const [certScanned, setCertScanned] = useState(false);
  const [labelPayload, setLabelPayload] = useState('');
  const [certPayload, setCertPayload] = useState('');
  const [claimCode, setClaimCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAutoImporting, setIsAutoImporting] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualInputType, setManualInputType] = useState('label');
  const [manualInputValue, setManualInputValue] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadItem = async () => {
      setLoading(true);
      setError('');
      try {
        const detail = await rackService.getCollectorRackItemDetail(routeItemId, {
          forceRefresh: true,
        });

        if (!isMounted) {
          return;
        }

        setItem(detail);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setItem(null);
        setError(loadError?.message || 'Failed to load selected item.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadItem();

    return () => {
      isMounted = false;
    };
  }, [routeItemId]);

  const applyLabelPayload = useCallback((payload) => {
    const scannedValue = String(payload || '').trim();
    if (!scannedValue || scannedValue === labelPayload) {
      return;
    }

    const expectedLabel = String(item?.labelQR || '').trim();
    if (expectedLabel && scannedValue !== expectedLabel) {
      Alert.alert('Invalid Label QR', 'Scanned label QR does not match this product item.');
      return;
    }

    const nextClaimCode = extractClaimCode(scannedValue);
    if (!nextClaimCode || isCertificatePayload(nextClaimCode)) {
      Alert.alert('Invalid Label QR', 'Label QR payload does not include a valid claim code.');
      return;
    }

    setLabelPayload(scannedValue);
    setClaimCode(nextClaimCode);
    setLabelScanned(true);
  }, [item?.labelQR, labelPayload]);

  const applyCertificatePayload = useCallback((payload) => {
    const scannedValue = String(payload || '').trim();
    if (!scannedValue || scannedValue === certPayload) {
      return;
    }

    const expectedCertificate = String(item?.certificateQR || '').trim();
    if (expectedCertificate && scannedValue !== expectedCertificate) {
      Alert.alert('Invalid Certificate QR', 'Scanned certificate QR does not match this product item.');
      return;
    }

    if (!expectedCertificate && !isCertificatePayload(scannedValue)) {
      Alert.alert('Invalid Certificate QR', 'Certificate QR must use the expected Digital Seal format.');
      return;
    }

    setCertPayload(scannedValue);
    setCertScanned(true);
  }, [item?.certificateQR, certPayload]);

  useFocusEffect(
    useCallback(() => {
      applyLabelPayload(decodeScanParam(params.labelScannedData));
      applyCertificatePayload(decodeScanParam(params.certificateScannedData));
    }, [applyCertificatePayload, applyLabelPayload, params.certificateScannedData, params.labelScannedData])
  );

  const canClaim = useMemo(
    () => labelScanned && certScanned && Boolean(String(claimCode || '').trim()) && !isSubmitting,
    [labelScanned, certScanned, claimCode, isSubmitting]
  );

  const applyPayloadByType = useCallback((type, payload) => {
    if (type === 'certificate') {
      applyCertificatePayload(payload);
      return;
    }

    applyLabelPayload(payload);
  }, [applyCertificatePayload, applyLabelPayload]);

  const decodeQrFromUri = useCallback(async (uri, type) => {
    try {
      const decoded = await Camera.scanFromURLAsync(uri);
      if (!decoded || decoded.length === 0) {
        Alert.alert('No QR Found', 'Could not detect a QR code. Try a clearer image.');
        return;
      }

      applyPayloadByType(type, decoded[0].data);
    } catch (_error) {
      Alert.alert('Read Failed', 'Unable to read QR from this image. Please try a clearer image.');
    }
  }, [applyPayloadByType]);

  const pickQrFromGallery = useCallback(async (type) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access to upload QR image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await decodeQrFromUri(result.assets[0].uri, type);
    }
  }, [decodeQrFromUri]);

  const pickQrFromFiles = useCallback(async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await decodeQrFromUri(result.assets[0].uri, type);
      }
    } catch (_error) {
      Alert.alert('Read Failed', 'Unable to open selected file. Please try again.');
    }
  }, [decodeQrFromUri]);

  const handleUploadQr = useCallback((type) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Choose from Gallery', 'Choose from Files'],
          cancelButtonIndex: 0,
        },
        (selectedIndex) => {
          if (selectedIndex === 1) {
            pickQrFromGallery(type);
          }
          if (selectedIndex === 2) {
            pickQrFromFiles(type);
          }
        }
      );
      return;
    }

    Alert.alert('Select Source', 'Where is your QR image?', [
      { text: 'Gallery', onPress: () => pickQrFromGallery(type) },
      { text: 'Files', onPress: () => pickQrFromFiles(type) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pickQrFromFiles, pickQrFromGallery]);

  const openManualQrInput = useCallback((type) => {
    setManualInputType(type);
    setManualInputValue('');
    setShowManualModal(true);
  }, []);

  const submitManualQrInput = useCallback(() => {
    const value = String(manualInputValue || '').trim();
    if (!value) {
      Alert.alert('Empty Input', 'Please paste or type the QR payload text first.');
      return;
    }

    applyPayloadByType(manualInputType, value);
    setShowManualModal(false);
    setManualInputValue('');
  }, [applyPayloadByType, manualInputType, manualInputValue]);

  const autoImportClaimedNft = useCallback(async (claimResult, selectedItem) => {
    const contractAddress = String(
      selectedItem?.contractAddress || selectedItem?.transaction?.contract || ''
    ).trim();
    const tokenId = resolveTokenId(claimResult?.tokenId, selectedItem?.tokenId);

    if (!isHexWalletAddress(contractAddress) || !tokenId) {
      return;
    }

    setIsAutoImporting(true);
    try {
      if (!wallet?.address) {
        await connectWallet();
      }

      const accepted = await watchNftInWallet({
        contractAddress,
        tokenId,
        image: selectedItem?.image,
        name: selectedItem?.name,
        description: `Digital Seal NFT for ${selectedItem?.name || 'claimed item'}`,
      });

      if (!accepted) {
        Alert.alert(
          'NFT Claimed',
          'Claim completed successfully. MetaMask import request was cancelled.'
        );
      }
    } catch (importError) {
      Alert.alert(
        'NFT Claimed',
        `${importError?.message || 'Auto import to MetaMask failed.'}\n\n` +
        `You can import manually with:\nContract: ${contractAddress}\nToken ID: ${tokenId}`
      );
    } finally {
      setIsAutoImporting(false);
    }
  }, [wallet?.address, connectWallet, watchNftInWallet]);

  const handleClaim = async () => {
    if (!canClaim) {
      return;
    }

    try {
      setIsSubmitting(true);
      const claimResult = await apiRequest('/claim', {
        method: 'POST',
        authRequired: true,
        body: {
          claimCode: String(claimCode || '').trim(),
        },
      });

      rackService.clearRackCache();
      await autoImportClaimedNft(claimResult, item);
      setShowSuccess(true);
    } catch (claimError) {
      Alert.alert('Claim Failed', claimError?.message || 'Unable to claim this item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToRack = () => {
    setShowSuccess(false);
    router.replace('/(tabs)/(collector)/rack');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.loadingText}>Loading item...</Text>
      </View>
    );
  }

  if (!item || error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#E74C3C" />
        <Text style={styles.errorText}>{error || 'Failed to load item.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const StepCircle = ({ done, number }) => (
    <View style={[styles.stepCircle, done && styles.stepCircleDone]}>
      {done ? <Ionicons name="checkmark" size={16} color="#fff" /> : <Text style={styles.stepNumber}>{number}</Text>}
    </View>
  );

  const ScanStep = ({ number, title, type, scanned, preview }) => (
    <View style={styles.stepSection}>
      <View style={styles.stepRow}>
        <StepCircle done={scanned} number={number} />
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{title}</Text>

          {!scanned && (
            <>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnHalf]}
                  onPress={() =>
                    router.push({
                      pathname: `/(tabs)/item/${encodeURIComponent(routeItemId)}/scanner`,
                      params: { type },
                    })
                  }
                >
                  <Ionicons name="qr-code-outline" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Scan QR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnHalf, styles.actionBtnOutline]}
                  onPress={() => handleUploadQr(type)}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color="#111" />
                  <Text style={[styles.actionBtnText, { color: '#111' }]}>Upload QR</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline]}
                onPress={() => openManualQrInput(type)}
              >
                <Ionicons name="create-outline" size={16} color="#111" />
                <Text style={[styles.actionBtnText, { color: '#111' }]}>Input Manual String</Text>
              </TouchableOpacity>
              <Text style={styles.uploadHint}>Upload supports Gallery & Files</Text>
            </>
          )}

          {scanned && (
            <View style={styles.scannedBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#27AE60" />
              <Text style={styles.scannedText}>Verified</Text>
              <Text style={styles.payloadPreview}>{shortPayload(preview)}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.connector} />
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Claim Ownership</Text>

        <View style={styles.stepSection}>
          <View style={styles.stepRow}>
            <StepCircle done={false} number={1} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Selected Item</Text>
              <View style={styles.itemInfoBox}>
                <Text style={styles.itemInfoName}>
                  {item.name} <Text style={styles.itemInfoId}>{item.id}</Text>
                </Text>
                <View style={styles.itemMetaRow}>
                  <Text style={styles.itemInfoCollection}>{item.collection}</Text>
                  <Text style={styles.itemInfoBy}> by </Text>
                  {!!item.brandLogo && (
                    <Image source={{ uri: item.brandLogo }} style={styles.brandLogo} resizeMode="contain" />
                  )}
                  <Text style={styles.itemInfoBrand}>{item.brand}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.connector} />
        </View>

        <ScanStep
          number={2}
          title="Scan Product Label QR"
          type="label"
          scanned={labelScanned}
          preview={labelPayload}
        />

        <ScanStep
          number={3}
          title="Scan Certificate QR"
          type="certificate"
          scanned={certScanned}
          preview={certPayload}
        />

        <View style={styles.stepSection}>
          <View style={styles.stepRow}>
            <StepCircle done={false} number={4} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Claim NFT & Ownership</Text>
              <TouchableOpacity
                style={[styles.actionBtn, (!canClaim || isSubmitting) && styles.actionBtnDisabled]}
                onPress={handleClaim}
                disabled={!canClaim || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                )}
                <Text style={styles.actionBtnText}>{isSubmitting ? 'Claiming...' : 'Claim Ownership'}</Text>
              </TouchableOpacity>
              {isAutoImporting && (
                <Text style={styles.metaMaskHint}>Preparing MetaMask NFT import...</Text>
              )}
            </View>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={handleGoToRack}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Ownership Claimed</Text>
            <Text style={styles.modalSubtitle}>
              Ownership and NFT transfer are completed for {item.name} ({item.id}).
            </Text>
            <TouchableOpacity style={styles.modalBtnFull} onPress={handleGoToRack}>
              <Text style={styles.modalBtnText}>Go to Your Rack</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showManualModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManualModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.manualModalCard}>
            <Text style={styles.manualModalTitle}>
              {manualInputType === 'certificate' ? 'Input Certificate QR' : 'Input Label QR'}
            </Text>
            <Text style={styles.manualModalHint}>
              Paste the full QR payload text, then submit to verify.
            </Text>

            <TextInput
              style={styles.manualInput}
              value={manualInputValue}
              onChangeText={setManualInputValue}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Paste QR payload here"
              placeholderTextColor="#999"
              multiline
            />

            <View style={styles.manualBtnRow}>
              <TouchableOpacity
                style={[styles.manualBtn, styles.manualBtnSecondary]}
                onPress={() => setShowManualModal(false)}
              >
                <Text style={styles.manualBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manualBtn, styles.manualBtnPrimary]}
                onPress={submitManualQrInput}
              >
                <Text style={styles.manualBtnPrimaryText}>Use This Value</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: { fontSize: 14, color: '#888' },
  errorText: { fontSize: 15, color: '#E74C3C', fontWeight: '600', textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  headerBar: {
    height: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backText: { fontSize: 17, fontWeight: '600', color: '#111' },

  scroll: { paddingHorizontal: 24, paddingTop: 24 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: '#111', marginBottom: 28 },

  stepSection: { marginBottom: 0 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  stepCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepCircleDone: { backgroundColor: '#27AE60' },
  stepNumber: { color: '#fff', fontSize: 16, fontWeight: '700' },
  stepContent: { flex: 1, paddingBottom: 16, gap: 10 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginTop: 8 },
  connector: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 18,
    marginVertical: 4,
  },

  itemInfoBox: { gap: 4 },
  itemInfoName: { fontSize: 15, fontWeight: '700', color: '#111' },
  itemInfoId: { fontWeight: '500', color: '#888' },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  itemInfoCollection: { fontSize: 13, color: '#555' },
  itemInfoBy: { fontSize: 13, color: '#aaa' },
  brandLogo: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f96a1b' },
  itemInfoBrand: { fontSize: 13, color: '#555', fontWeight: '600' },

  actionBtn: {
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  actionBtnHalf: { flex: 1 },
  actionBtnOutline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  uploadHint: { fontSize: 12, color: '#666', marginTop: -2 },
  actionBtnDisabled: { backgroundColor: '#aaa' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  metaMaskHint: { fontSize: 12, color: '#666', marginTop: 4 },

  scannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    backgroundColor: '#F0FDF4',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  scannedText: { fontSize: 13, fontWeight: '600', color: '#27AE60' },
  payloadPreview: { fontSize: 11, color: '#166534' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#27AE60',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111' },
  modalSubtitle: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },
  modalBtnFull: {
    marginTop: 6,
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  manualModalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  manualModalTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  manualModalHint: { fontSize: 13, color: '#555', lineHeight: 18 },
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
  manualBtnRow: { flexDirection: 'row', gap: 10 },
  manualBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualBtnPrimary: { backgroundColor: '#111' },
  manualBtnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  manualBtnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  manualBtnSecondaryText: { color: '#111', fontSize: 13, fontWeight: '700' },
});
