
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, useWindowDimensions, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import ItemDetailCard from '@/components/card/ItemDetailCard';
import { rackService } from '@/services/rackService';

const FILTERS = ['All', 'In Process', 'In Shipment', 'Wait for Claim', 'Claimed'];

const normalizeRackKeyPart = (value) => String(value ?? '').trim().toLowerCase();

const getRackItemIdentity = (item) => {
  const productItemId = Number(item?.backendItemId);
  if (Number.isFinite(productItemId)) {
    return `product-item:${productItemId}`;
  }

  const orderId = Number(item?.orderId);
  if (Number.isFinite(orderId)) {
    return `order:${orderId}`;
  }

  const serial = normalizeRackKeyPart(item?.itemSerial);
  if (serial) {
    return `serial:${serial}`;
  }

  const displayId = normalizeRackKeyPart(item?.id);
  if (displayId) {
    return `display:${displayId}`;
  }

  return '';
};

const PolDot = ({ size = 16 }) => (
  <View style={[styles.polDot, { width: size, height: size, borderRadius: size / 2 }]} />
);

export default function YourRackScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const router = useRouter();

  const GAP      = 12;
  const PADDING  = 20;
  const cardWidth = (width - PADDING * 2 - GAP) / 2;

  const loadRackItems = useCallback(async ({ forceRefresh = false } = {}) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const data = await rackService.getCollectorRackItems({ forceRefresh });
      setItems(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setItems([]);
      setError(loadError?.message || 'Failed to load your rack.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRackItems({ forceRefresh: true });
    }, [loadRackItems])
  );

  const filtered = useMemo(
    () => items.filter((item) => (activeFilter === 'All' ? true : item.status === activeFilter)),
    [activeFilter, items]
  );

  const filteredWithRenderKeys = useMemo(() => {
    const keyOccurrences = new Map();

    return filtered.map((item, index) => {
      const identity = getRackItemIdentity(item);
      const fallbackId = normalizeRackKeyPart(item?.id) || 'unknown';
      const baseKey = identity || `rack-fallback:${fallbackId}:${index}`;

      const nextCount = (keyOccurrences.get(baseKey) || 0) + 1;
      keyOccurrences.set(baseKey, nextCount);

      return {
        item,
        renderKey: nextCount === 1 ? baseKey : `${baseKey}:dup-${nextCount}`,
      };
    });
  }, [filtered]);

  const totalPol = items.reduce((sum, item) => sum + Number(item.polValue || 0), 0);

  const badgeCounts = FILTERS.reduce((acc, f) => {
    if (f !== 'All') acc[f] = items.filter((i) => i.status === f).length;
    return acc;
  }, {});

  const firstItemId = items[0]?.id;
  const transferRouteItemId = firstItemId || 'inbox';

  return (
    <View style={styles.container}>

      <View style={styles.headerRow}>
        <Text style={styles.title}>Your Rack</Text>
        <TouchableOpacity
          style={[styles.refreshBtn, refreshing && styles.refreshBtnDisabled]}
          onPress={() => loadRackItems({ forceRefresh: true })}
          disabled={refreshing}
        >
          <Text style={styles.refreshBtnText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Value</Text>
        <PolDot size={18} />
        <Text style={styles.totalPol}>POL {totalPol.toLocaleString()}</Text>
        <Text style={styles.totalUsd}>USD {Math.round(totalPol / 10.5).toLocaleString()}</Text>
      </View>

      {}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {FILTERS.map((f) => {
          const isActive = activeFilter === f;
          const count    = f !== 'All' ? badgeCounts[f] : null;
          const hasBadge = count !== null && count > 0;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterBtn,
                isActive && styles.filterBtnActive,
                hasBadge && { paddingRight: 8 },
              ]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {f}
              </Text>
              {hasBadge && (
                <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {}
      <ScrollView
        style={styles.cardList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.cardGrid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRackItems({ forceRefresh: true })}
            tintColor="#111"
          />
        }
      >
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#111" />
            <Text style={styles.loadingText}>Loading your owned products...</Text>
          </View>
        )}

        {!loading && !!error && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Unable to load your rack</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadRackItems({ forceRefresh: true })}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && filteredWithRenderKeys.map(({ item, renderKey }) => {

          return (
            <ItemDetailCard
              key={renderKey}
              item={item}
              cardWidth={cardWidth}
              showStatus={true}
              onPress={() => router.push(`/(tabs)/item/${encodeURIComponent(item.id)}`)}
            />
          );
        })}

        {!loading && !error && filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No owned products found</Text>
            <Text style={styles.emptyText}>You do not own any product items for this filter yet.</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {}
      <TouchableOpacity
        style={styles.transferBtn}
        onPress={() => router.push(
          `/(tabs)/item/${encodeURIComponent(transferRouteItemId)}/transferownership`
        )}
      >
        <Text style={styles.transferIcon}>↗</Text>
        <Text style={styles.transferText}>Transfer Ownership</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#fff',
    paddingHorizontal: 20, paddingTop: 10,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  refreshBtn: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshBtnDisabled: {
    backgroundColor: '#666',
  },
  refreshBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  title:     { fontSize: 28, fontWeight: '700', color: '#111' },
  totalRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#111' },
  totalPol:   { fontSize: 14, fontWeight: '800', color: '#111' },
  totalUsd:   { fontSize: 14, fontWeight: '600', color: '#555' },
  polDot:     { backgroundColor: '#7B3FE4' },

  filterScroll: {
    marginBottom: 16, flexGrow: 0,
    marginHorizontal: -20, paddingHorizontal: 20,
  },
  filterContainer: { gap: 8, paddingRight: 20, alignItems: 'center' },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 18,
    borderRadius: 20, borderWidth: 1, borderColor: '#ddd', gap: 6,
  },
  filterBtnActive:       { backgroundColor: '#111', borderColor: '#111' },
  filterText:            { fontSize: 14, color: '#555', fontWeight: '500' },
  filterTextActive:      { color: '#fff', fontWeight: '700' },
  filterBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#333', alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeActive:     { backgroundColor: '#fff' },
  filterBadgeText:       { fontSize: 10, fontWeight: '800', color: '#fff' },
  filterBadgeTextActive: { color: '#111' },

  cardList: { flex: 1 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  loadingState: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  emptyState: { width: '100%', paddingVertical: 60, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, color: '#333', fontWeight: '700' },
  emptyText:  { fontSize: 14, color: '#888', textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  transferBtn: {
    position: 'absolute', bottom: 24, right: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111', paddingHorizontal: 20,
    paddingVertical: 14, borderRadius: 14, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  transferBtnDisabled: {
    opacity: 0.55,
  },
  transferIcon: { color: '#fff', fontSize: 16 },
  transferText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});