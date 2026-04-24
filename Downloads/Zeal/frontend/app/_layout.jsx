'use client';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Slot, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoleProvider } from '../components/context/RoleContext';
import { WalletProvider } from '../components/context/WalletContext';
import TabRoleToggle from '../components/ui/tab-role-toggle';
import LoadingPulse from '../components/shared/loading-pulse';
import { subscribeNetworkActivity } from '../services/networkActivity';






const { width } = require('react-native').Dimensions.get('window');
const isTablet = width >= 768;

function RootLayout() {
  const segments = useSegments();
  const [activeRequests, setActiveRequests] = useState(0);
  const [showGlobalLoader, setShowGlobalLoader] = useState(false);
  const loaderTimerRef = useRef(null);
  const normalizedSegments = segments.map((segment) =>
    segment.replace(/[()]/g, '')
  );
  const lastSegment = segments[segments.length - 1];
  const isRoleTabsScreen =
    normalizedSegments.includes('creator') || normalizedSegments.includes('collector');
  const normalizedPath = normalizedSegments.join('/');
  const showRoleToggle =
    normalizedPath === 'tabs/collector/marketplace' ||
    normalizedPath === 'tabs/creator/tabs/collection';


















  const detailRoutes = new Set([
    'collection-detail',
    'collection-detail-listed',
    'edit-collection',
    'new-collection',
    'new-collection-continue',
    'item-orders-dynamic',
    'item-detail',
    'add-variation',
    'generate-all-qr-collections',
    '[itemId]',
    'brand',
    'product',
    'item',
  ]);

  const isDetailScreen = detailRoutes.has(lastSegment);

  useEffect(() => {
    const unsubscribe = subscribeNetworkActivity((count) => {
      setActiveRequests(count);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeRequests > 0) {
      if (loaderTimerRef.current == null) {
        loaderTimerRef.current = setTimeout(() => {
          setShowGlobalLoader(true);
          loaderTimerRef.current = null;
        }, 180);
      }
      return;
    }

    if (loaderTimerRef.current != null) {
      clearTimeout(loaderTimerRef.current);
      loaderTimerRef.current = null;
    }

    setShowGlobalLoader(false);
  }, [activeRequests]);

  useEffect(() => {
    return () => {
      if (loaderTimerRef.current != null) {
        clearTimeout(loaderTimerRef.current);
      }
    };
  }, []);

  return (
    <RoleProvider>
      <WalletProvider>
        <View style={styles.appRoot}>
          {isRoleTabsScreen && !isDetailScreen && (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
              <View style={styles.container}>
                <View style={[styles.content, !showRoleToggle && styles.contentLogoOnly]}>
                  <Text style={styles.logo}>ZEAL</Text>
                  {showRoleToggle && <TabRoleToggle />}
                {}
                </View>
              </View>
            </SafeAreaView>
          )}

          <Slot />

          {showGlobalLoader && (
            <View pointerEvents="none" style={styles.globalLoadingOverlay}>
              <View style={styles.globalLoadingCard}>
                <LoadingPulse label="Syncing latest data..." />
              </View>
            </View>
          )}
        </View>
      </WalletProvider>
    </RoleProvider>
  );
}

export default function RootLayoutWrapper() {
  return <RootLayout />;
}




const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: '#fff',
    paddingBottom: 0,
  },
  globalLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.36)',
    zIndex: 100,
  },
  globalLoadingCard: {
    minWidth: 210,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9e9e9',
  },
  container: { backgroundColor: '#fff' },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  contentLogoOnly: {
    justifyContent: 'flex-start',
  },
  logo: {
    fontSize: isTablet ? 32 : 28,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#000',
    textTransform: 'uppercase',
  },
  
});