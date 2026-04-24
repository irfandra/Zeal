import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Image,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { collectionService } from '@/services/collectionService';
import { buildBackendQrUrl } from '@/services/qrService';
import LoadingPulse from '@/components/shared/loading-pulse';

const PLATFORM_QR_EMAIL = String(
  process.env.EXPO_PUBLIC_PLATFORM_QR_EMAIL ||
  process.env.EXPO_PUBLIC_PLATFORM_EMAIL ||
  'zealsysinfo@gmail.com'
).trim();

const parseParam = (value) => (Array.isArray(value) ? value[0] : value);

const QR_TYPE_OPTIONS = [
  { key: 'nft', label: 'NFT' },
  { key: 'label', label: 'Label' },
  { key: 'certificate', label: 'Certificate' },
];

const getQrTypeLabel = (key) =>
  QR_TYPE_OPTIONS.find((option) => option.key === key)?.label || 'NFT';

const shortWallet = (value) => {
  const wallet = String(value || '').trim();
  if (!wallet) {
    return '-';
  }

  if (wallet.length <= 14) {
    return wallet;
  }

  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
};

const formatDateOnly = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toISOString().split('T')[0];
};

const hasAllQrPayloads = (payloads) =>
  Boolean(payloads?.nft && payloads?.label && payloads?.certificate);

const sanitizeFileName = (value) =>
  String(value || 'qr')
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'qr';

const createProductItemQrEntry = (itemRow, product, index) => {
  const rawSerial = String(itemRow?.itemSerial || itemRow?.id || '').replace(/^#/, '').trim();
  const fallbackSerial = `${product?.id || 'PROD'}-${String(index + 1).padStart(4, '0')}`;
  const itemSerial = rawSerial || fallbackSerial;
  const qrPayloads = {
    nft: String(itemRow?.nftQrCode || '').trim(),
    label: String(itemRow?.productLabelQrCode || '').trim(),
    certificate: String(itemRow?.certificateQrCode || '').trim(),
  };
  const safeSealStatus = String(itemRow?.sealStatus || '').trim().toUpperCase() || 'UNKNOWN';
  const isBurned = safeSealStatus === 'BURNED';
  const status = isBurned ? 'burned' : (hasAllQrPayloads(qrPayloads) ? 'generated' : 'pending');
  const generatedAt = formatDateOnly(itemRow?.mintedAt || itemRow?.createdAt);
  const tokenId = itemRow?.tokenId == null ? '-' : String(itemRow.tokenId).trim() || '-';
  const currentOwnerWalletFull = String(itemRow?.currentOwnerWallet || '').trim() || '-';
  const currentOwnerWallet = shortWallet(currentOwnerWalletFull);

  return {
    id: `ITEM:${itemSerial}`,
    itemName: product?.name || 'Product Item',
    collection: product?.collection || '-',
    productId: String(product?.id || '-'),
    itemSerial,
    tokenId,
    sealStatus: safeSealStatus,
    currentOwnerWallet,
    currentOwnerWalletFull,
    qrPayloads,
    genDate: status === 'generated' ? generatedAt : '-',
    status,
    verified: false,
  };
};

export default function GenerateAllQrCollections() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestedCollectionId = parseParam(params.collectionId);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [allItemEntries, setAllItemEntries] = useState([]);

  const [qrMetaById, setQrMetaById] = useState({});
  const [selectedQrTypeById, setSelectedQrTypeById] = useState({});

  const [selectedQrId, setSelectedQrId] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [isBatchEmailing, setIsBatchEmailing] = useState(false);

  const loadQrSourceData = useCallback(async (showInitialLoader = true) => {
    try {
      if (showInitialLoader) {
        setIsLoadingData(true);
      }
      setLoadError('');

      let mergedProducts = [];

      if (requestedCollectionId) {
        const products = await collectionService.getProductsByCollection(requestedCollectionId).catch(() => []);
        mergedProducts = (Array.isArray(products) ? products : []).map((product) => ({
          ...product,
          collectionId: String(requestedCollectionId),
        }));
      } else {
        const creatorCollections = await collectionService.getCollectionsForCreatorHome().catch(() => []);
        const scopedCollections = Array.isArray(creatorCollections) && creatorCollections.length > 0
          ? creatorCollections
          : await collectionService.getCollectionsByBrand().catch(() => []);

        const productGroups = await Promise.all(
          (Array.isArray(scopedCollections) ? scopedCollections : []).map(async (collection) => {
            const products = await collectionService.getProductsByCollection(collection.id).catch(() => []);
            return products.map((product) => ({
              ...product,
              collectionId: String(collection.id),
              collection: product?.collection || collection?.title || '-',
            }));
          })
        );

        mergedProducts = productGroups.flat();
      }

      if (mergedProducts.length === 0) {
        setAllItemEntries([]);
        return;
      }

      const itemGroups = await Promise.all(
        mergedProducts.map(async (product) => {
          const detail = await collectionService.getProductById(product.id, {
            includeOnlyPurchasableItems: false,
          }).catch(() => null);
          const rows = Array.isArray(detail?.purchaseItems) ? detail.purchaseItems : [];
          const productMeta = {
            ...product,
            name: detail?.name || product?.name,
            collection: detail?.collection || product?.collection,
          };
          return rows.map((row, index) => createProductItemQrEntry(row, productMeta, index));
        })
      );

      const flatItems = itemGroups.flat();

      const uniqueBySerial = new Map();
      for (const row of flatItems) {
        if (!uniqueBySerial.has(row.itemSerial)) {
          uniqueBySerial.set(row.itemSerial, row);
        }
      }

      const uniqueRows = Array.from(uniqueBySerial.values());
      setAllItemEntries(uniqueRows);
    } catch (error) {
      setAllItemEntries([]);
      setLoadError(error?.message || 'Failed to load QR source data');
    } finally {
      if (showInitialLoader) {
        setIsLoadingData(false);
      }
      setIsRefreshing(false);
    }
  }, [requestedCollectionId]);

  useEffect(() => {
    loadQrSourceData();
  }, [loadQrSourceData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadQrSourceData(false);
  }, [loadQrSourceData]);

  const scopedQrCodes = useMemo(
    () =>
      allItemEntries.map((entry) => {
        const meta = qrMetaById[entry.id] || {};
        const status = entry.status;
        const selectedQrType = selectedQrTypeById[entry.id] || 'nft';
        const qrUrls =
          status === 'generated'
            ? {
                nft: buildBackendQrUrl(entry.qrPayloads.nft),
                label: buildBackendQrUrl(entry.qrPayloads.label),
                certificate: buildBackendQrUrl(entry.qrPayloads.certificate),
              }
            : { nft: '', label: '', certificate: '' };
        return {
          ...entry,
          status,
          genDate: entry.genDate,
          verified: Boolean(meta.verified),
          selectedQrType,
          qrUrl: qrUrls[selectedQrType] || '',
          activeQrPayload: entry.qrPayloads[selectedQrType],
          qrUrls,
        };
      }),
    [allItemEntries, qrMetaById, selectedQrTypeById]
  );

  const generatedRows = useMemo(
    () => scopedQrCodes.filter((row) => row.status === 'generated' && String(row.qrUrl || '').trim()),
    [scopedQrCodes]
  );
  const hasGeneratedRows = generatedRows.length > 0;
  const modalQr = useMemo(
    () => scopedQrCodes.find((row) => row.id === selectedQrId) || null,
    [scopedQrCodes, selectedQrId]
  );

  useEffect(() => {
    if (showQrModal && !modalQr) {
      setShowQrModal(false);
      setSelectedQrId('');
    }
  }, [showQrModal, modalQr]);

  const handleDownloadQr = (qr) => {
    const run = async () => {
      if (qr.status !== 'generated') {
        Alert.alert('No QR available', 'This item has no backend QR payload yet.');
        return;
      }

      const qrUrl = String(qr.qrUrl || '').trim();
      if (!qrUrl) {
        Alert.alert('No QR available', 'This item has no downloadable QR image yet.');
        return;
      }

      const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow photo library access to save QR images.');
        return;
      }

      const fileBase = sanitizeFileName(`zeal-${qr.selectedQrType}-${qr.itemSerial}`);
      const fileUri = `${FileSystem.cacheDirectory}${fileBase}-${Date.now()}.png`;
      const downloadResult = await FileSystem.downloadAsync(qrUrl, fileUri);
      await MediaLibrary.saveToLibraryAsync(downloadResult.uri);

      try {
        await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
      } catch (_error) {

      }

      Alert.alert('Saved to Gallery', `${getQrTypeLabel(qr.selectedQrType)} QR saved for ${qr.itemSerial}.`);
    };

    run().catch((error) => {
      Alert.alert('Download Failed', error?.message || 'Unable to save QR image to gallery.');
    });
  };

  const handleDownloadAll = async () => {
    if (!hasGeneratedRows || isBatchDownloading) {
      return;
    }

    setIsBatchDownloading(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow photo library access to save QR images.');
        return;
      }

      let savedCount = 0;
      for (const qr of generatedRows) {
        const qrUrl = String(qr.qrUrl || '').trim();
        if (!qrUrl) {
          continue;
        }

        const fileBase = sanitizeFileName(`zeal-${qr.selectedQrType}-${qr.itemSerial}`);
        const fileUri = `${FileSystem.cacheDirectory}${fileBase}-${Date.now()}-${savedCount}.png`;
        const downloadResult = await FileSystem.downloadAsync(qrUrl, fileUri);
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        savedCount += 1;

        try {
          await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
        } catch (_error) {

        }
      }

      if (savedCount === 0) {
        Alert.alert('Nothing Saved', 'No downloadable QR images were found.');
        return;
      }

      Alert.alert('Download Complete', `${savedCount} QR image(s) saved to gallery.`);
    } catch (error) {
      Alert.alert('Download Failed', error?.message || 'Unable to download all QR images.');
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const handleEmailAll = async () => {
    if (!hasGeneratedRows || isBatchEmailing) {
      return;
    }

    setIsBatchEmailing(true);
    try {
      const recipient = PLATFORM_QR_EMAIL || 'zealsysinfo@gmail.com';
      const parsedCollectionId = Number(requestedCollectionId);
      const emailResult = await collectionService.emailQrAttachments({
        collectionId: Number.isFinite(parsedCollectionId) && parsedCollectionId > 0
          ? parsedCollectionId
          : null,
        recipientEmail: recipient,
      });

      const attachmentsCount = Number(emailResult?.attachmentsCount || 0);
      const itemsIncluded = Number(emailResult?.itemsIncluded || 0);
      const resolvedRecipient = String(emailResult?.recipientEmail || recipient).trim() || recipient;

      Alert.alert(
        'Email Sent',
        `${attachmentsCount} QR attachment(s) from ${itemsIncluded} item(s) were sent to ${resolvedRecipient}.`
      );
    } catch (error) {
      Alert.alert('Email Failed', error?.message || 'Unable to send QR email from backend.');
    } finally {
      setIsBatchEmailing(false);
    }
  };

  const handleShareQr = async (qr) => {
    if (qr.status !== 'generated') {
      Alert.alert('No QR available', 'This item has no backend QR payload yet.');
      return;
    }

    try {
      const qrTypeLabel = getQrTypeLabel(qr.selectedQrType);
      await Share.share({
        message: `Digital Seal ${qrTypeLabel} QR for ${qr.itemName}\n\nItem Serial: ${qr.itemSerial}\nCollection: ${qr.collection}\nGenerated: ${qr.genDate}\nPayload: ${qr.activeQrPayload}`,
        title: 'Share QR Code',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleVerifyQr = (qr) => {
    setQrMetaById((previous) => {
      const current = previous[qr.id] || {};
      return {
        ...previous,
        [qr.id]: {
          ...current,
          verified: !Boolean(current.verified),
        },
      };
    });
  };

  const handleShowQr = (qr) => {
    if (qr.status !== 'generated') {
      Alert.alert('No QR available', 'This item has no backend QR payload yet.');
      return;
    }

    setSelectedQrId(qr.id);
    setShowQrModal(true);
  };

  const handleSelectQrType = (qrId, qrType) => {
    setSelectedQrTypeById((previous) => ({
      ...previous,
      [qrId]: qrType,
    }));
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>QR Code Generator</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#111" />
          }
        >
          {isLoadingData && (
            <View style={s.loadingWrap}>
              <LoadingPulse label="Loading product items..." />
            </View>
          )}

          {!isLoadingData && !!loadError && (
            <View style={s.errorWrap}>
              <Text style={s.errorText}>{loadError}</Text>
            </View>
          )}

          {!isLoadingData && !loadError && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Product Item NFT & QR Rows</Text>
              {scopedQrCodes.length === 0 ? (
                <View style={s.emptyWrap}>
                  <Text style={s.emptyText}>No product-item QR rows found for this collection yet.</Text>
                </View>
              ) : (
                <View style={s.qrList}>
                  {scopedQrCodes.map((qr) => (
                  <View key={qr.id} style={s.qrCard}>
                    <View style={s.qrCardLeft}>
                      {qr.status === 'generated' ? (
                        <TouchableOpacity style={s.qrPreview} onPress={() => handleShowQr(qr)}>
                          <Image source={{ uri: qr.qrUrl }} style={s.qrImage} />
                          <View style={s.qrOverlay}>
                            <Ionicons name="expand" size={20} color="#fff" />
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <View style={s.qrPreviewUnavailable}>
                          <Ionicons name="qr-code-outline" size={20} color="#888" />
                          <Text style={s.qrUnavailableText}>No QR available</Text>
                        </View>
                      )}
                    </View>

                    <View style={s.qrCardContent}>
                      <Text style={s.qrItemName}>{qr.itemName}</Text>
                      <Text style={s.qrCollection}>{qr.collection}</Text>
                      <Text style={s.qrProductMeta}>Product ID: {qr.productId}</Text>
                      <Text style={s.qrItemSerial}>Item Serial: {qr.itemSerial}</Text>
                      <Text style={s.qrProductMeta}>Token ID: {qr.tokenId}</Text>
                      <Text style={s.qrProductMeta}>Seal Status: {qr.sealStatus}</Text>
                      <Text style={s.qrProductMeta}>Owner Wallet: {qr.currentOwnerWallet}</Text>
                      <View style={s.qrStatusRow}>
                        <View
                          style={[
                            s.statusBadge,
                            qr.status === 'generated' && s.statusBadgeGenerated,
                            qr.status === 'burned' && s.statusBadgeBurned,
                            qr.status === 'pending' && s.statusBadgePending,
                          ]}
                        >
                          <Text
                            style={[
                              s.statusBadgeText,
                              qr.status === 'generated' && s.statusBadgeTextGenerated,
                              qr.status === 'burned' && s.statusBadgeTextBurned,
                            ]}
                          >
                            {qr.status === 'generated'
                              ? 'Generated'
                              : (qr.status === 'burned' ? 'Burned' : 'Pending')}
                          </Text>
                        </View>
                        {qr.verified && (
                          <View style={s.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                            <Text style={s.verifiedText}>Verified</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.qrDate}>Generated: {qr.genDate}</Text>
                    </View>

                    <View style={s.qrCardActions}>
                      <TouchableOpacity
                        style={[s.qrActionBtn, qr.status !== 'generated' && s.qrActionBtnDisabled]}
                        onPress={() => handleVerifyQr(qr)}
                        disabled={qr.status !== 'generated'}
                      >
                        <Ionicons
                          name={qr.verified ? 'checkmark-circle' : 'checkmark-circle-outline'}
                          size={20}
                          color={qr.status !== 'generated' ? '#bbb' : qr.verified ? '#4CAF50' : '#888'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.qrActionBtn, qr.status !== 'generated' && s.qrActionBtnDisabled]}
                        onPress={() => handleDownloadQr(qr)}
                        disabled={qr.status !== 'generated'}
                      >
                        <Ionicons name="download" size={20} color={qr.status !== 'generated' ? '#bbb' : '#111'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.qrActionBtn, qr.status !== 'generated' && s.qrActionBtnDisabled]}
                        onPress={() => handleShareQr(qr)}
                        disabled={qr.status !== 'generated'}
                      >
                        <Ionicons name="share-social" size={20} color={qr.status !== 'generated' ? '#bbb' : '#111'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                </View>
              )}
            </View>
          )}

          <View style={s.section}>
            <Text style={s.sectionTitle}>Batch Actions</Text>
            <View style={s.batchActionRow}>
              <TouchableOpacity
                style={[s.batchActionBtn, (!hasGeneratedRows || isBatchDownloading) && s.batchActionBtnDisabled]}
                disabled={!hasGeneratedRows || isBatchDownloading}
                onPress={handleDownloadAll}
              >
                <MaterialCommunityIcons name="download-multiple" size={18} color="#111" />
                <Text style={s.batchActionBtnText}>{isBatchDownloading ? 'Downloading...' : 'Download All'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.batchActionBtn, !hasGeneratedRows && s.batchActionBtnDisabled]} disabled={!hasGeneratedRows}>
                <Ionicons name="print" size={18} color="#111" />
                <Text style={s.batchActionBtnText}>Print All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.batchActionBtn, (!hasGeneratedRows || isBatchEmailing) && s.batchActionBtnDisabled]}
                disabled={!hasGeneratedRows || isBatchEmailing}
                onPress={handleEmailAll}
              >
                <Ionicons name="mail" size={18} color="#111" />
                <Text style={s.batchActionBtnText}>{isBatchEmailing ? 'Sending...' : 'Email QRs'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.infoCard}>
            <View style={s.infoHeader}>
              <Ionicons name="information-circle" size={20} color="#3498db" />
              <Text style={s.infoTitle}>About QR Data</Text>
            </View>
            <Text style={s.infoText}>
              QR payloads come from backend pre-mint and are stored per product item. Burned product items are not eligible for QR/NFT generation.
            </Text>
          </View>
        </ScrollView>

        <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setShowQrModal(false)} />
          <View style={s.modalCenter} pointerEvents="box-none">
            <View style={s.qrModalCard}>
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowQrModal(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>

              {modalQr && (
                <>
                  <View style={s.modalQrTypeRow}>
                    {QR_TYPE_OPTIONS.map((typeOption) => {
                      const isActive = modalQr.selectedQrType === typeOption.key;
                      return (
                        <TouchableOpacity
                          key={`modal:${modalQr.id}:${typeOption.key}`}
                          style={[s.qrTypeChip, isActive && s.qrTypeChipActive]}
                          onPress={() => handleSelectQrType(modalQr.id, typeOption.key)}
                        >
                          <Text style={[s.qrTypeChipText, isActive && s.qrTypeChipTextActive]}>
                            {typeOption.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Image source={{ uri: modalQr.qrUrl }} style={s.qrModalImage} />
                  <Text style={s.qrModalName}>{modalQr.itemName}</Text>
                  <Text style={s.qrModalCollection}>{modalQr.collection}</Text>
                  <Text style={s.qrModalProductMeta}>Product ID: {modalQr.productId}</Text>
                  <Text style={s.qrModalItemSerial}>Item Serial: {modalQr.itemSerial}</Text>
                  <Text style={s.qrModalProductMeta}>Token ID: {modalQr.tokenId}</Text>
                  <Text style={s.qrModalProductMeta}>Seal Status: {modalQr.sealStatus}</Text>
                  <Text style={s.qrModalProductMeta}>Owner Wallet: {modalQr.currentOwnerWalletFull}</Text>

                  <View style={s.qrModalActions}>
                    <TouchableOpacity
                      style={[s.modalActionBtn, s.modalActionBtnPrimary]}
                      onPress={() => handleDownloadQr(modalQr)}
                    >
                      <Ionicons name="download" size={18} color="#fff" />
                      <Text style={s.modalActionBtnText}>Download</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.modalActionBtn, s.modalActionBtnSecondary]}
                      onPress={() => handleShareQr(modalQr)}
                    >
                      <Ionicons name="share-social" size={18} color="#111" />
                      <Text style={[s.modalActionBtnText, { color: '#111' }]}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f8f8' },
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },

  qrTypeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  modalQrTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  qrTypeChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  qrTypeChipActive: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  qrTypeChipText: {
    fontSize: 11,
    color: '#444',
    fontWeight: '600',
  },
  qrTypeChipTextActive: {
    color: '#fff',
  },

  content: { flex: 1, paddingHorizontal: 16 },
  section: { marginVertical: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 12 },

  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  loadingText: { fontSize: 13, color: '#555' },
  errorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  errorText: { fontSize: 12, color: '#b91c1c', textAlign: 'center' },

  qrList: { gap: 12 },
  emptyWrap: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  qrCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    alignItems: 'center',
  },
  qrCardLeft: { padding: 8 },
  qrPreview: { position: 'relative' },
  qrPreviewUnavailable: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f3f3f3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  qrImage: { width: 70, height: 70, borderRadius: 8 },
  qrUnavailableText: {
    fontSize: 9,
    color: '#777',
    textAlign: 'center',
    fontWeight: '600',
  },
  qrOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  qrCardContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 8 },
  qrItemName: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 2 },
  qrCollection: { fontSize: 12, color: '#888', marginBottom: 2 },
  qrProductMeta: { fontSize: 11, color: '#666', marginBottom: 2, fontWeight: '600' },
  qrItemSerial: { fontSize: 11, color: '#666', marginBottom: 6, fontWeight: '600' },
  qrStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  statusBadge: { backgroundColor: '#fee', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeGenerated: { backgroundColor: '#efe' },
  statusBadgeBurned: { backgroundColor: '#f1f1f1' },
  statusBadgePending: { backgroundColor: '#ffe' },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: '#cc0000' },
  statusBadgeTextGenerated: { color: '#4CAF50' },
  statusBadgeTextBurned: { color: '#555' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verifiedText: { fontSize: 11, color: '#4CAF50', fontWeight: '600' },
  qrDate: { fontSize: 11, color: '#aaa' },

  qrCardActions: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  qrActionBtn: { padding: 8 },
  qrActionBtnDisabled: { opacity: 0.45 },

  batchActionRow: { flexDirection: 'row', gap: 8 },
  batchActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    gap: 6,
  },
  batchActionBtnText: { fontSize: 12, fontWeight: '600', color: '#111' },
  batchActionBtnDisabled: { opacity: 0.45 },

  infoCard: {
    backgroundColor: '#ddf',
    borderRadius: 12,
    padding: 14,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  infoText: { fontSize: 13, color: '#333', lineHeight: 20 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  qrModalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    width: '90%',
    maxWidth: 320,
  },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 8 },
  qrModalImage: { width: 240, height: 240, borderRadius: 12, marginBottom: 16 },
  qrModalName: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 4 },
  qrModalCollection: { fontSize: 13, color: '#888', marginBottom: 6 },
  qrModalProductMeta: { fontSize: 12, color: '#555', fontWeight: '600', marginBottom: 4 },
  qrModalItemSerial: { fontSize: 12, color: '#555', fontWeight: '600', marginBottom: 16 },
  qrModalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  modalActionBtnPrimary: { backgroundColor: '#111' },
  modalActionBtnSecondary: { backgroundColor: '#f0f0f0' },
  modalActionBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
