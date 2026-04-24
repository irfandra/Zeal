import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView, ScrollView, View, Text, Image, ImageBackground,
  Alert, StyleSheet, TouchableOpacity, TextInput, Modal, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collectionService } from '@/services/collectionService';
import LoadingPulse from '@/components/shared/loading-pulse';

const parseParam = (value) => (Array.isArray(value) ? value[0] : value);

const PolIcon = ({ size = 18 }) => (
  <View style={[s.polIcon, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[s.polIconText, { fontSize: size * 0.5 }]}>P</Text>
  </View>
);

const getRarityBadgeStyle = (rarity) => {
  const normalized = String(rarity || '').trim().toLowerCase();
  if (normalized === 'rare') {
    return { backgroundColor: '#B8860B', color: '#fff' };
  }
  if (normalized === 'limited') {
    return { backgroundColor: '#C0392B', color: '#fff' };
  }
  return { backgroundColor: '#333', color: '#fff' };
};

const shortenWalletAddress = (wallet) => {
  const safeWallet = String(wallet || '').trim();
  if (!safeWallet) {
    return 'Unavailable';
  }

  if (safeWallet.length <= 14) {
    return safeWallet;
  }

  return `${safeWallet.slice(0, 6)}...${safeWallet.slice(-4)}`;
};

const formatPolEstimate = (value) => {
  const safeValue = String(value ?? '').trim();
  if (!safeValue) {
    return '0';
  }

  const numeric = Number(safeValue);
  if (!Number.isFinite(numeric)) {
    return safeValue;
  }

  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
};

const formatWholeNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '0';
  }

  return Math.trunc(numeric).toLocaleString('en-US');
};

const MintListModal = ({
  visible,
  onClose,
  onConfirm,
  isSubmitting = false,
  estimate = null,
  isEstimateLoading = false,
  estimateError = '',
}) => {
  const [date, setDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (d) =>
    d?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Modal
      transparent
      statusBarTranslucent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.modalRoot}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={s.modalCenter} pointerEvents="box-none">
          <View style={s.modalCard}>
          <Text style={s.modalTitle}>List Your Collections to Marketplace ?</Text>
          <Text style={s.modalBody}>
            Listing will generate NFT token IDs and QR payloads for all prepared product items,
            then publish the collection for sale and lock collection edits.
          </Text>
          <Text style={[s.modalBody, { marginTop: 8, fontWeight: '600' }]}>
            This can take a little longer while blockchain minting is in progress.
          </Text>
          <Text style={[s.modalBody, { marginTop: 12, textAlign: 'justify' }]}>
            Define a sales time frame for the collection. When the time frame ends, the
            collection will no longer be available for sale, and any unsold NFTs will be
            automatically burned.
          </Text>
          <View style={s.estimateCard}>
            <Text style={s.estimateTitle}>Estimated Minting Fee</Text>
            {isEstimateLoading ? (
              <View style={s.estimateLoadingRow}>
                <ActivityIndicator size="small" color="#111" />
                <Text style={s.estimateLoadingText}>Checking blockchain gas and mint batches...</Text>
              </View>
            ) : estimateError ? (
              <Text style={s.estimateErrorText}>{estimateError}</Text>
            ) : (
              <View>
                <View style={s.estimateRow}>
                  <Text style={s.estimateLabel}>Estimated Fee</Text>
                  <Text style={s.estimateValue}>{formatPolEstimate(estimate?.estimatedFeePol)} POL</Text>
                </View>
                <View style={s.estimateRow}>
                  <Text style={s.estimateLabel}>Items To Mint</Text>
                  <Text style={s.estimateValue}>{formatWholeNumber(estimate?.itemsToMint)}</Text>
                </View>
                <View style={s.estimateRow}>
                  <Text style={s.estimateLabel}>Mint Batches</Text>
                  <Text style={s.estimateValue}>{formatWholeNumber(estimate?.mintBatchCount)}</Text>
                </View>
                <View style={s.estimateRow}>
                  <Text style={s.estimateLabel}>Gas Payer Wallet</Text>
                  <Text style={s.estimateValue}>{shortenWalletAddress(estimate?.payerWallet)}</Text>
                </View>
              </View>
            )}
            <Text style={s.estimateHint}>Estimate may change slightly based on live gas price.</Text>
          </View>
          <Text style={s.timeFrameLabel}>Time Frame</Text>
          <TouchableOpacity style={s.dateInput} onPress={() => setShowPicker(true)}>
            <Text style={date ? s.dateText : s.datePlaceholder}>
              {date ? formatDate(date) : 'Select Date'}
            </Text>
            <Ionicons name="calendar-outline" size={24} color="#555" />
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(_, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setDate(d); }}
            />
          )}
            <TouchableOpacity
              style={[s.modalMintBtn, isSubmitting && s.modalMintBtnDisabled]}
              onPress={() => onConfirm?.(date)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View style={s.modalSubmittingRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={s.modalMintBtnText}>Generating NFTs & Listing...</Text>
                </View>
              ) : (
                <Text style={s.modalMintBtnText}>List Collection</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function CollectionDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [search, setSearch] = useState('');
  const [showMintModal, setShowMintModal] = useState(false);
  const [isMintListing, setIsMintListing] = useState(false);
  const [mintEstimate, setMintEstimate] = useState(null);
  const [isMintEstimateLoading, setIsMintEstimateLoading] = useState(false);
  const [mintEstimateError, setMintEstimateError] = useState('');
  const [isEndingSaleNow, setIsEndingSaleNow] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState(parseParam(params.status) || 'Draft');

  const collectionId = parseParam(params.collectionId);

  const loadMintEstimate = useCallback(async () => {
    if (!collectionId) {
      setMintEstimate(null);
      setMintEstimateError('Collection id is missing, unable to estimate minting fee.');
      return;
    }

    try {
      setIsMintEstimateLoading(true);
      setMintEstimateError('');
      const estimate = await collectionService.getCollectionMintEstimate(collectionId);
      setMintEstimate(estimate && typeof estimate === 'object' ? estimate : null);
    } catch (error) {
      setMintEstimate(null);
      setMintEstimateError(error?.message || 'Unable to estimate minting fee right now.');
    } finally {
      setIsMintEstimateLoading(false);
    }
  }, [collectionId]);

  const loadCatalogItems = useCallback(async (showInitialLoader = true) => {
    if (!collectionId) {
      setCatalogItems([]);
      setLoadError('Missing collection id');
      if (showInitialLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
      return;
    }

    try {
      if (showInitialLoader) {
        setIsLoading(true);
      }
      setLoadError('');
      const data = await collectionService.getProductsByCollection(collectionId);
      setCatalogItems(Array.isArray(data) ? data : []);
    } catch (error) {
      setCatalogItems([]);
      setLoadError(error?.message || 'Failed to load collection products');
    } finally {
      if (showInitialLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [collectionId]);

  useEffect(() => {
    loadCatalogItems();
  }, [loadCatalogItems]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadCatalogItems(false);
  }, [loadCatalogItems]);

  const heroImage = params.image
    ? decodeURIComponent(params.image)
    : 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800';
  const title = parseParam(params.title) || 'Collection';
  const subtitle = parseParam(params.subtitle) || 'Product Collection';
  const description = parseParam(params.description) || '';
  useEffect(() => {
    setStatus(parseParam(params.status) || 'Draft');
  }, [params.status]);

  const normalizedStatus = String(status || '').trim().toUpperCase();
  const isListedCollection = ['LISTED', 'IN PROCESS'].includes(normalizedStatus);
  const isSaleLocked = ['LISTED', 'IN PROCESS', 'PREPARED', 'PREMINTED', 'EXPIRED'].includes(normalizedStatus);
  const tag = parseParam(params.tag) || 'Rare';
  const rarityBadgeStyle = getRarityBadgeStyle(tag);

  const totalItems = useMemo(() => {
    const total = catalogItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
    return total.toLocaleString();
  }, [catalogItems]);

  const soldItems = useMemo(() => {
    const sold = catalogItems.reduce((sum, item) => {
      const total = Number(item.total || 0);
      const available = Number(item.available || 0);
      return sum + Math.max(total - available, 0);
    }, 0);

    return sold.toLocaleString();
  }, [catalogItems]);

  const filtered = catalogItems.filter(
    (i) => i.name.toLowerCase().includes(search.toLowerCase()) ||
           i.collection.toLowerCase().includes(search.toLowerCase())
  );

  const handleCardPress = (item) =>
    router.push({
      pathname: '/item-detail',
      params: { itemId: item.id, name: item.name, collection: item.collection, brand: item.brand, brandLogo: item.brandLogo || '', available: item.available, total: item.total, priceAmount: item.priceAmount, priceUsd: item.priceUsd, image: encodeURIComponent(item.image) },
    });

  const handleEditCollection = () => {
    if (isSaleLocked) {
      return;
    }

    if (!collectionId) {
      Alert.alert('Missing Collection', 'Unable to edit because collection id is missing.');
      return;
    }

    router.push({
      pathname: '/(tabs)/(creator)/edit-collection',
      params: {
        collectionId: String(collectionId),
        title,
        subtitle,
        description,
        image: encodeURIComponent(heroImage),
        status,
        tag,
      },
    });
  };

  const handleDeleteCollection = () => {
    if (isSaleLocked || !collectionId || isDeleting) {
      return;
    }

    Alert.alert(
      'Delete Collection',
      'This action cannot be undone. Do you want to delete this collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await collectionService.deleteCollection(collectionId);
              Alert.alert('Collection Deleted', 'Collection deleted successfully.');
              router.replace('/(tabs)/(creator)/(tabs)/collection');
            } catch (error) {
              Alert.alert('Delete Failed', error?.message || 'Unable to delete collection.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleDemoEndSaleNow = () => {
    if (!isListedCollection || !collectionId || isEndingSaleNow) {
      return;
    }

    Alert.alert(
      'End Sale Now',
      'This will end the sale for this collection immediately and process unsold items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Sale',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsEndingSaleNow(true);
              const updatedCollection = await collectionService.endCollectionSaleNow(collectionId);
              setStatus(updatedCollection?.status || 'Expired');
              await loadCatalogItems(false);
              Alert.alert('Sale Ended', 'Collection sale ended and unsold items were processed.');
            } catch (error) {
              Alert.alert('End Sale Failed', error?.message || 'Unable to end sale for this collection.');
            } finally {
              setIsEndingSaleNow(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenQrGenerator = () => {
    if (!collectionId) {
      Alert.alert('Missing Collection', 'Unable to open QR list because collection id is missing.');
      return;
    }

    router.push({
      pathname: '/(tabs)/(creator)/generate-all-qr-collections',
      params: {
        collectionId: String(collectionId),
      },
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#111" />
          }
        >

          {}
          <View style={s.heroWrap}>
            <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={s.heroOverlay} />
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={18} color="#fff" />
              <Text style={s.backText}>Back</Text>
            </TouchableOpacity>
            <View style={s.heroContent}>
              <View style={[s.rareBadge, { backgroundColor: rarityBadgeStyle.backgroundColor }]}> 
                <Text style={[s.rareBadgeText, { color: rarityBadgeStyle.color }]}>{tag}</Text>
              </View>
              <Text style={s.heroTitle}>{title}</Text>
              <View style={s.heroSubRow}>
                <Text style={s.heroSubText}>{subtitle}</Text>
                <Text style={s.heroDivider}>  |  </Text>
                <Text style={s.heroDraft}>{status}</Text>
              </View>
            </View>
          </View>

          {}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Total Items</Text>
              <Text style={s.statValue}>{totalItems}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Sold</Text>
              <Text style={s.statValue}>{soldItems}</Text>
            </View>
          </View>

          {}
          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.bodyText}>
              {description ||
                'This collection is loaded from your offchain backend products and can be listed without blockchain integration.'}
            </Text>

            <TouchableOpacity style={s.qrAccessBtn} onPress={handleOpenQrGenerator}>
              <Ionicons name="qr-code-outline" size={16} color="#fff" />
              <Text style={s.qrAccessBtnText}>View Product Item NFT & QR</Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View style={s.loadingWrap}>
              <LoadingPulse label="Loading products..." />
            </View>
          )}

          {!isLoading && !!loadError && (
            <View style={s.errorWrap}>
              <Text style={s.errorText}>{loadError}</Text>
            </View>
          )}

          {}
          <View style={s.catalogHeaderRow}>
            <View style={s.catalogTitleWrap}>
              <Text style={s.catalogTitle}>Catalog</Text>
              <Text style={s.catalogCount}>  {filtered.length} / {catalogItems.length}</Text>
            </View>
            <TouchableOpacity style={s.filterBtn}>
              <Ionicons name="menu" size={18} color="#222" />
              <Text style={s.filterText}>Filter</Text>
            </TouchableOpacity>
          </View>

          {}
          <View style={s.searchWrap}>
            <Ionicons name="search" size={18} color="#aaa" style={{ marginRight: 8 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Search Catalog"
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {}
          <View style={s.grid}>
            {filtered.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={s.catalogCard}
                activeOpacity={0.85}
                onPress={() => handleCardPress(item)}
              >
                <ImageBackground
                  source={{ uri: item.image }}
                  style={s.cardBg}
                  imageStyle={s.cardBgImage}
                >
                  <View style={s.cardOverlay} />
                  <View style={s.cardContent}>
                    <View style={s.cardBrandRow}>
                      <View style={s.brandCircle}>
                        <Text style={s.brandCircleText}>H</Text>
                      </View>
                      <Text style={s.cardBrandName}>{item.brand}</Text>
                    </View>
                    <Text style={s.cardName}>{item.name}</Text>
                    <Text style={s.cardCollection}>{item.collection}</Text>
                    <Text style={s.cardAvailable}>
                      {item.available.toLocaleString()} of {item.total.toLocaleString()} items
                    </Text>
                    <View style={s.cardPriceRow}>
                      <PolIcon size={16} />
                      <Text style={s.cardPriceToken}>POL</Text>
                      <Text style={s.cardPriceAmount}>{item.priceAmount}</Text>
                      <Text style={s.cardPriceUsd}>{item.priceUsd}</Text>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {}
        <View style={s.footer}>
          {isListedCollection ? (
            <TouchableOpacity
              style={[s.demoEndSaleBtn, isEndingSaleNow && s.actionBtnDisabled]}
              onPress={handleDemoEndSaleNow}
              disabled={isEndingSaleNow}
            >
              <Text style={s.mintBtnText}>{isEndingSaleNow ? 'Ending Sale...' : 'Demo: End Sale Now'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.mintBtn, (isSaleLocked || isMintListing) && s.actionBtnDisabled]}
              onPress={() => {
                setShowMintModal(true);
                loadMintEstimate();
              }}
              disabled={isSaleLocked || isMintListing}
            >
              <Text style={s.mintBtnText}>List & Generate NFTs</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.deleteBtn, (isDeleting || isSaleLocked) && s.actionBtnDisabled]}
            onPress={handleDeleteCollection}
            disabled={isDeleting || isSaleLocked}
          >
            <Ionicons name="trash" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.editBtn, isSaleLocked && s.actionBtnDisabled]}
            onPress={handleEditCollection}
            disabled={isSaleLocked}
          >
            <Ionicons name="create-outline" size={22} color="#222" />
          </TouchableOpacity>
        </View>

        {}
        <MintListModal
          visible={showMintModal}
          onClose={() => setShowMintModal(false)}
          isSubmitting={isMintListing}
          estimate={mintEstimate}
          isEstimateLoading={isMintEstimateLoading}
          estimateError={mintEstimateError}
          onConfirm={async (selectedDate) => {
            if (!selectedDate) {
              Alert.alert('Date Required', 'Please select a listing date first.');
              return;
            }

            const saleEndAt = new Date(selectedDate);
            saleEndAt.setHours(23, 59, 59, 0);

            if (Number.isNaN(saleEndAt.getTime()) || saleEndAt.getTime() <= Date.now()) {
              Alert.alert('Invalid Date', 'Please choose a future sale end date.');
              return;
            }

            try {
              setIsMintListing(true);
              const listedCollection = await collectionService.listCollectionForSale({
                collectionId,
                salesEndAt: saleEndAt,
              });

              setShowMintModal(false);

              const endDateLabel = saleEndAt.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });

              router.replace({
                pathname: '/collection-detail-listed',
                params: {
                  listed: true,
                  collectionId,
                  title: listedCollection?.title || title,
                  subtitle: listedCollection?.subtitle || subtitle,
                  status: listedCollection?.status || 'Listed',
                  endDate: `Ends ${endDateLabel}`,
                  tag: listedCollection?.tag || tag,
                  tagColor: listedCollection?.tagColor || '',
                  tagTextColor: listedCollection?.tagTextColor || '',
                  image: encodeURIComponent(listedCollection?.image || heroImage),
                },
              });
            } catch (error) {
              Alert.alert('List Failed', error?.message || 'Unable to list this collection.');
            } finally {
              setIsMintListing(false);
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f0f0' },
  container: { flex: 1 },

  heroWrap: { width: '100%', height: 260 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  backBtn: { position: 'absolute', top: 56, left: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  heroContent: { position: 'absolute', bottom: 32, left: 0, right: 0, padding: 16 },
  rareBadge: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 10 },
  rareBadgeText: { fontSize: 13, fontWeight: '700' },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6 },
  heroSubRow: { flexDirection: 'row', alignItems: 'center' },
  heroSubText: { color: '#ddd', fontSize: 13 },
  heroDivider: { color: '#aaa', fontSize: 13 },
  heroDraft: { color: '#ddd', fontSize: 13, fontStyle: 'italic' },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: -28,
    zIndex: 10,
  },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  statLabel: { fontSize: 14, color: '#333', fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111' },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 8 },
  bodyText: { fontSize: 15, color: '#333', lineHeight: 23 },
  qrAccessBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrAccessBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#555',
  },
  errorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#b91c1c',
    textAlign: 'center',
  },

  catalogHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 24, marginBottom: 12 },
  catalogTitleWrap: { flexDirection: 'row', alignItems: 'baseline' },
  catalogTitle: { fontSize: 28, fontWeight: '900', color: '#111' },
  catalogCount: { fontSize: 15, color: '#888' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#ccc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, gap: 8, backgroundColor: '#fff' },
  filterText: { fontSize: 15, color: '#222', fontWeight: '500' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  catalogCard: { width: '47%', borderRadius: 18, overflow: 'hidden', height: 200 },
  cardBg: { flex: 1, justifyContent: 'flex-end' },
  cardBgImage: { borderRadius: 18 },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.40)', borderRadius: 18 },
  cardContent: { padding: 10 },
  cardBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  brandCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e87722', justifyContent: 'center', alignItems: 'center' },
  brandCircleText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  cardBrandName: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardName: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 1 },
  cardCollection: { color: '#ddd', fontSize: 11, marginBottom: 1 },
  cardAvailable: { color: '#ccc', fontSize: 10, fontStyle: 'italic', marginBottom: 6 },
  cardPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardPriceToken: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardPriceAmount: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardPriceUsd: { color: '#bbb', fontSize: 10, textDecorationLine: 'line-through' },

  polIcon: { backgroundColor: '#7b5ea7', justifyContent: 'center', alignItems: 'center' },
  polIconText: { color: '#fff', fontWeight: '700' },

  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#f0f0f0', borderTopWidth: 1, borderTopColor: '#e0e0e0', gap: 10 },
  mintBtn: { flex: 1, backgroundColor: '#111', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  demoEndSaleBtn: { flex: 1, backgroundColor: '#b45309', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  mintBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#cc0000', borderRadius: 14, width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.45 },
  editBtn: { backgroundColor: '#fff', borderRadius: 14, width: 52, height: 52, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd' },

  modalRoot: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 22, padding: 24, width: '88%', maxWidth: 420, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 14, lineHeight: 30 },
  modalBody: { fontSize: 14.5, color: '#333', lineHeight: 22 },
  estimateCard: {
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f7f8fa',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  estimateTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 8 },
  estimateLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  estimateLoadingText: { flex: 1, fontSize: 12.5, color: '#4b5563' },
  estimateErrorText: { fontSize: 12.5, color: '#b91c1c', lineHeight: 18 },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
    gap: 10,
  },
  estimateLabel: { fontSize: 12.5, color: '#4b5563' },
  estimateValue: { fontSize: 12.5, color: '#111', fontWeight: '700' },
  estimateHint: { fontSize: 11.5, color: '#6b7280', marginTop: 8, lineHeight: 16 },
  timeFrameLabel: { fontSize: 16, fontWeight: '700', color: '#111', marginTop: 22, marginBottom: 10 },
  dateInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#d0d0d0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },
  datePlaceholder: { fontSize: 15, color: '#aaa' },
  dateText: { fontSize: 15, color: '#111', fontWeight: '600' },
  modalMintBtn: { backgroundColor: '#111', borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  modalMintBtnDisabled: { opacity: 0.6 },
  modalSubmittingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalMintBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
