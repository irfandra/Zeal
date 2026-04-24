import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collectionService } from '@/services/collectionService';
import LoadingPulse from '@/components/shared/loading-pulse';

const { width: SW } = Dimensions.get('window');
const isTablet = SW >= 768;

const parseParam = (value) => (Array.isArray(value) ? value[0] : value);

const PolIcon = ({ size = 18 }) => (
  <View style={[s.polIcon, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[s.polIconText, { fontSize: size * 0.5 }]}>P</Text>
  </View>
);

const SectionHeader = ({ title, count, onFilter }) => (
  <View style={s.sectionHeaderRow}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={s.sectionHeaderTitle}>{title}</Text>
      {count ? <Text style={s.sectionHeaderCount}>  {count}</Text> : null}
    </View>
    <TouchableOpacity style={s.filterBtn} onPress={onFilter}>
      <Ionicons name="menu" size={18} color="#222" />
      <Text style={s.filterText}>Filter</Text>
    </TouchableOpacity>
  </View>
);

const SearchBar = ({ value, onChange, placeholder = 'Search...' }) => (
  <View style={s.searchWrap}>
    <Ionicons name="search" size={18} color="#aaa" style={{ marginRight: 8 }} />
    <TextInput
      style={s.searchInput}
      placeholder={placeholder}
      placeholderTextColor="#aaa"
      value={value}
      onChangeText={onChange}
    />
  </View>
);

const DataTable = ({ headers, rows, renderRow }) => (
  <View style={s.table}>
    <View style={[s.tableRow, { marginBottom: 4 }]}>
      {headers.map((h, i) => (
        <Text
          key={i}
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[s.tableCell, s.tableHeaderText, { flex: h.flex || 1 }]}
        >
          {h.label}
        </Text>
      ))}
    </View>
    {rows.map((row, idx) => (
      <View key={idx} style={[s.tableRow, s.tableRowCard]}>
        {renderRow(row)}
      </View>
    ))}
  </View>
);

export default function CollectionDetailListed() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Catalog');
  const [catalogItems, setCatalogItems] = useState([]);
  const [activityRows, setActivityRows] = useState([]);
  const [ownerRows, setOwnerRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEndingSaleNow, setIsEndingSaleNow] = useState(false);
  const [loadError, setLoadError] = useState('');

  const collectionId = parseParam(params.collectionId);

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
      const [products, activity, owners] = await Promise.all([
        collectionService.getProductsByCollection(collectionId),
        collectionService.getCollectionActivity(collectionId),
        collectionService.getCollectionOwners(collectionId),
      ]);
      setCatalogItems(Array.isArray(products) ? products : []);
      setActivityRows(Array.isArray(activity) ? activity : []);
      setOwnerRows(Array.isArray(owners) ? owners : []);
    } catch (error) {
      setCatalogItems([]);
      setActivityRows([]);
      setOwnerRows([]);
      setLoadError(error?.message || 'Failed to load listed products');
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
    ? decodeURIComponent(parseParam(params.image))
    : 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800';
  const title = parseParam(params.title) || 'Birkin Collections';
  const subtitle = parseParam(params.subtitle) || 'Luxury Bags';
  const endDate = parseParam(params.endDate) || 'Ends in 14/04/2026  23:59';
  const status = parseParam(params.status) || 'Listed';
  const normalizedStatus = String(status).trim().toLowerCase();
  const isListedStatus = normalizedStatus === 'listed' || normalizedStatus === 'in process';
  const tag = parseParam(params.tag) || 'Rare';
  const tagColor = parseParam(params.tagColor) || '#111';
  const tagTextColor = parseParam(params.tagTextColor) || '#fff';

  const totalItems = useMemo(() => {
    const fromParams = parseParam(params.items) || parseParam(params.itemsCount);
    if (fromParams) {
      const cleaned = String(fromParams).replace(/[^0-9,]/g, '');
      if (cleaned) return cleaned;
    }

    const total = catalogItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
    return total.toLocaleString('en-US');
  }, [params.items, params.itemsCount, catalogItems]);

  const soldItems = useMemo(() => {
    const sold = catalogItems.reduce((sum, item) => {
      const total = Number(item.total || 0);
      const available = Number(item.available || 0);
      return sum + Math.max(total - available, 0);
    }, 0);

    return sold.toLocaleString('en-US');
  }, [catalogItems]);

  const filtered = catalogItems.filter((item) => {
    const keyword = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(keyword) ||
      item.collection.toLowerCase().includes(keyword)
    );
  });

  const filteredActivity = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    if (!keyword) {
      return activityRows;
    }

    return activityRows.filter((row) =>
      [row.event, row.item, row.price, row.from, row.to]
        .some((value) => String(value || '').toLowerCase().includes(keyword))
    );
  }, [activityRows, search]);

  const filteredOwners = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    if (!keyword) {
      return ownerRows;
    }

    return ownerRows.filter((row) =>
      [row.id, row.edition, row.price]
        .some((value) => String(value || '').toLowerCase().includes(keyword))
    );
  }, [ownerRows, search]);

  const handleCardPress = (item) =>
    router.push({
      pathname: '/item-detail',
      params: {
        itemId: item.id,
        name: item.name,
        collection: item.collection,
        brand: item.brand,
        brandLogo: item.brandLogo || '',
        available: item.available,
        total: item.total,
        priceAmount: item.priceAmount,
        priceUsd: item.priceUsd,
        image: encodeURIComponent(item.image),
      },
    });

  const handleDemoEndSaleNow = () => {
    if (!isListedStatus || !collectionId || isEndingSaleNow) {
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
              await collectionService.endCollectionSaleNow(collectionId);
              await loadCatalogItems(false);
              Alert.alert('Sale Ended', 'Collection sale ended and unsold items were processed.');
              router.replace('/(tabs)/(creator)/(tabs)/collection');
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
          <View style={s.heroWrap}>
            <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={s.heroOverlay} />

            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={16} color="#000" />
              <Text style={s.backText}>Back</Text>
            </TouchableOpacity>

            <View style={s.heroContent}>
              <View style={[s.badge, { backgroundColor: tagColor }]}> 
                <Text style={[s.badgeText, { color: tagTextColor }]}>{tag}</Text>
              </View>
              <Text style={s.heroTitle}>{title}</Text>
              <View style={s.heroSubRow}>
                {[subtitle, status, endDate].map((t, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <Text style={s.heroDivider}> | </Text>}
                    <Text style={s.heroSub}>{t}</Text>
                  </React.Fragment>
                ))}
              </View>
            </View>
          </View>

          <View style={s.statsRow}>
            {[[ 'Total Items', totalItems ], [ 'Sold', soldItems ]].map(([label, val]) => (
              <View key={label} style={s.statCard}>
                <Text style={s.statLabel}>{label}</Text>
                <Text style={s.statValue}>{val}</Text>
              </View>
            ))}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.bodyText}>
              This listed collection view is connected to backend data and styled to the requested design.
            </Text>

            {isListedStatus && (
              <TouchableOpacity
                style={[s.demoEndSaleBtn, isEndingSaleNow && s.demoEndSaleBtnDisabled]}
                onPress={handleDemoEndSaleNow}
                disabled={isEndingSaleNow}
              >
                <Text style={s.demoEndSaleBtnText}>{isEndingSaleNow ? 'Ending Sale...' : 'Demo: End Sale Now'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.qrAccessBtn} onPress={handleOpenQrGenerator}>
              <Ionicons name="qr-code-outline" size={16} color="#fff" />
              <Text style={s.qrAccessBtnText}>View Product Item NFT & QR</Text>
            </TouchableOpacity>
          </View>

          <View style={s.tabs}>
            {['Catalog', 'Activity', 'Owners'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'Catalog' && (
            <>
              <SectionHeader title="Catalog" count={`${filtered.length}/ ${catalogItems.length || 0}`} />
              <SearchBar value={search} onChange={setSearch} placeholder="Search Catalog" />

              {isLoading && (
                <View style={s.loadingWrap}>
                  <LoadingPulse label="Loading listed products..." />
                </View>
              )}

              {!isLoading && !!loadError && (
                <View style={s.errorWrap}>
                  <Text style={s.errorText}>{loadError}</Text>
                </View>
              )}

              {!isLoading && !loadError && (
                <View style={s.grid}>
                  {filtered.map((item) => (
                    <TouchableOpacity key={item.id} style={s.card} activeOpacity={0.85} onPress={() => handleCardPress(item)}>
                      <ImageBackground source={{ uri: item.image }} style={s.cardBg} imageStyle={s.cardBgImg}>
                        <View style={s.cardOverlay} />
                        <View style={s.cardContent}>
                          <View style={s.cardBrandRow}>
                            <View style={s.brandCircle}><Text style={s.brandCircleText}>H</Text></View>
                            <Text style={s.cardBrand}>{item.brand}</Text>
                          </View>
                          <Text style={s.cardName}>{item.name}</Text>
                          <Text style={s.cardCollection}>{item.collection}</Text>
                          <Text style={s.cardAvailable}>{item.available.toLocaleString()} of {item.total.toLocaleString()} items</Text>
                          <View style={s.cardPriceRow}>
                            <PolIcon size={16} />
                            <Text style={s.cardPriceToken}>POL</Text>
                            <Text style={s.cardPriceAmt}>{item.priceAmount}</Text>
                            {!!item.priceUsd && <Text style={s.cardPriceUsd}>{item.priceUsd}</Text>}
                          </View>
                        </View>
                      </ImageBackground>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {activeTab === 'Activity' && (
            <>
              <SectionHeader title="Activity" count={`${filteredActivity.length}/ ${activityRows.length || 0}`} />
              <SearchBar value={search} onChange={setSearch} placeholder="Search Activity" />
              <View style={s.tableSection}>
                <DataTable
                  headers={[
                    { label: 'Event' },
                    { label: 'Items' },
                    { label: 'Price' },
                    { label: 'From' },
                    { label: 'To' },
                  ]}
                  rows={filteredActivity}
                  renderRow={(row) => [
                    <Text key="e" numberOfLines={1} ellipsizeMode="tail" style={[s.tableCell, { flex: 1, fontSize: 12 }]}>{row.event}</Text>,
                    <Text key="i" numberOfLines={1} ellipsizeMode="tail" style={[s.tableCell, { flex: 1, fontSize: 12 }]}>{row.item}</Text>,
                    <View key="p" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#333' }}>POL </Text>
                      <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 11, flex: 1, color: '#333' }}>{row.price}</Text>
                    </View>,
                    <Text key="f" numberOfLines={1} ellipsizeMode="tail" style={[s.tableCell, { flex: 1, fontSize: 11 }]}>{row.from}</Text>,
                    <Text key="t" numberOfLines={1} ellipsizeMode="tail" style={[s.tableCell, { flex: 1, fontSize: 11 }]}>{row.to}</Text>,
                  ]}
                />
                {!isLoading && filteredActivity.length === 0 && (
                  <Text style={s.emptyTableText}>No transactions recorded yet.</Text>
                )}
              </View>
            </>
          )}

          {activeTab === 'Owners' && (
            <>
              <SectionHeader title="Owners" count={`${filteredOwners.length}/ ${ownerRows.length || 0}`} />
              <SearchBar value={search} onChange={setSearch} placeholder="Search Owners" />
              <View style={s.tableSection}>
                <DataTable
                  headers={[
                    { label: 'Owners', flex: 1.2 },
                    { label: 'Items', flex: 1.5 },
                    { label: 'Total Value', flex: 1.8 },
                  ]}
                  rows={filteredOwners}
                  renderRow={(row) => [
                    <Text key="id" numberOfLines={1} ellipsizeMode="tail" style={[s.tableCell, { flex: 1.2 }]}>{row.id}</Text>,
                    <Text key="ed" numberOfLines={1} ellipsizeMode="tail" style={[s.tableCell, { flex: 1.5 }]}>{row.edition}</Text>,
                    <View key="pr" style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                      <PolIcon size={16} />
                      <Text style={s.tablePriceLabel}>POL</Text>
                      <Text numberOfLines={1} ellipsizeMode="tail" style={[s.tableCell, { flex: 1 }]}>{row.price}</Text>
                    </View>,
                  ]}
                />
                {!isLoading && filteredOwners.length === 0 && (
                  <Text style={s.emptyTableText}>No ownership records found yet.</Text>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {activeTab === 'Catalog' && !isListedStatus && (
          <View style={s.footer}>
            <TouchableOpacity
              style={s.mintBtn}
              onPress={() => router.push('/generate-all-qr-collections')}
            >
              <Text style={s.mintBtnText}>Generate All QR</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },

  heroWrap: { width: '100%', height: 280, zIndex: 1, overflow: 'visible' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  backBtn: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  backText: { color: '#000', fontSize: 15, fontWeight: '600' },

  heroContent: { position: 'absolute', bottom: 32, left: 0, right: 0, padding: 16 },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  badgeText: { fontSize: 13, fontWeight: '700' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 },
  heroSubRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  heroSub: { color: '#ddd', fontSize: 13, fontStyle: 'italic' },
  heroDivider: { color: '#aaa', fontSize: 13 },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: -28,
    zIndex: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  statLabel: { fontSize: 14, color: '#333', fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111' },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 8 },
  bodyText: { fontSize: 15, color: '#333', lineHeight: 23 },
  demoEndSaleBtn: {
    marginTop: 14,
    backgroundColor: '#b45309',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  demoEndSaleBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  demoEndSaleBtnDisabled: {
    opacity: 0.55,
  },
  qrAccessBtn: {
    marginTop: 10,
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  qrAccessBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  tabs: { flexDirection: 'row', marginTop: 24, marginBottom: 4, paddingHorizontal: 10 },
  tabBtn: {
    flex: 1,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  tabBtnActive: { backgroundColor: '#000', borderColor: '#000' },
  tabText: { fontSize: isTablet ? 17 : 15, color: '#333' },
  tabTextActive: { color: '#fff', fontWeight: '600' },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeaderTitle: { fontSize: 26, fontWeight: '900', color: '#111' },
  sectionHeaderCount: { fontSize: 14, color: '#888' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
    backgroundColor: '#fff',
  },
  filterText: { fontSize: 14, color: '#222', fontWeight: '500' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },

  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    gap: 8,
  },
  loadingText: { fontSize: 13, color: '#555' },
  errorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  errorText: { fontSize: 12, color: '#b91c1c', textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  card: { width: '47%', borderRadius: 18, overflow: 'hidden', height: 200 },
  cardBg: { flex: 1, justifyContent: 'flex-end' },
  cardBgImg: { borderRadius: 18 },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius: 18,
  },
  cardContent: { padding: 10 },
  cardBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  brandCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e87722',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandCircleText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  cardBrand: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardName: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 1 },
  cardCollection: { color: '#ddd', fontSize: 11, marginBottom: 1 },
  cardAvailable: { color: '#ccc', fontSize: 10, fontStyle: 'italic', marginBottom: 6 },
  cardPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardPriceToken: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardPriceAmt: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardPriceUsd: { color: '#bbb', fontSize: 10, textDecorationLine: 'line-through' },

  tableSection: { paddingHorizontal: 16, marginTop: 4 },
  table: { backgroundColor: '#f2f2f2', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 8 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingVertical: 11,
    paddingHorizontal: 4,
  },
  tableRowCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 3,
    paddingHorizontal: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  tableCell: { flex: 1, fontSize: 13, color: '#333', overflow: 'hidden' },
  tableHeaderText: { fontWeight: '700', fontStyle: 'italic', fontSize: 13, color: '#222' },
  tablePriceLabel: { fontSize: 13, fontWeight: '700', color: '#111' },
  emptyTableText: { textAlign: 'center', color: '#666', fontSize: 13, marginTop: 10, marginBottom: 2 },

  polIcon: { backgroundColor: '#7b5ea7', justifyContent: 'center', alignItems: 'center' },
  polIconText: { color: '#fff', fontWeight: '700' },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  mintBtn: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  mintBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
