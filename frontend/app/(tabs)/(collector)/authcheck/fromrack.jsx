
import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ItemDetailCard from '../../../../components/card/ItemDetailCard';
import { rackService } from '@/services/rackService';

export default function FromRackPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadItems = useCallback(async ({ forceRefresh = false, showInitialLoader = true } = {}) => {
    if (showInitialLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError('');

    try {
      const data = await rackService.getCollectorClaimedRackItems({ forceRefresh });
      setItems(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setItems([]);
      setError(loadError?.message || 'Failed to load claimed items.');
    } finally {
      if (showInitialLoader) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    loadItems({ forceRefresh: true, showInitialLoader: false });
  }, [loadItems]);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const handleSelect = (item) => {

    router.navigate({
      pathname: '/authcheck',
      params: { selectedItem: encodeURIComponent(JSON.stringify(item)) },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#111"
          />
        }
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.pageTitle}>From Your Rack</Text>
            <Text style={styles.pageSubtitle}>Select a claimed item to verify.</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => loadItems({ forceRefresh: true, showInitialLoader: false })}
          >
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#111" />
            <Text style={styles.loadingText}>Loading claimed items...</Text>
          </View>
        )}

        {!loading && !!error && (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={40} color="#E74C3C" />
            <Text style={styles.emptyText}>Unable to load items</Text>
            <Text style={styles.emptySubtext}>
              {error}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadItems({ forceRefresh: true })}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && (
          <View style={styles.grid}>
            {items.map((item) => (
              <ItemDetailCard
                key={`${item.id}-${item.backendItemId || item.itemSerial || ''}`}
                item={item}
                showStatus={true}
                onPress={() => handleSelect(item)}
              />
            ))}
          </View>
        )}

        {!loading && !error && items.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={40} color="#ddd" />
            <Text style={styles.emptyText}>No claimed items</Text>
            <Text style={styles.emptySubtext}>
              Only claimed items can be verified.{"\n"}Claim an item first from your rack.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fff' },
  headerBar: {
    height: 44, paddingHorizontal: 16,
    justifyContent: 'center', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingVertical: 8, paddingHorizontal: 4,
  },
  backText:     { fontSize: 17, fontWeight: '600', color: '#111' },
  scroll:       { paddingHorizontal: 20, paddingTop: 20 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  pageTitle:    { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
  refreshBtn: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  refreshBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  emptyState:   { paddingVertical: 60, alignItems: 'center', gap: 8 },
  emptyText:    { fontSize: 15, color: '#aaa', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#ccc', textAlign: 'center', lineHeight: 20 },
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
});