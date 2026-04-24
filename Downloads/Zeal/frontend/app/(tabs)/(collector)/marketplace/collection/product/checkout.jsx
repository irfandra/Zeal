
import React from 'react';
import {
  Alert,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const PolDot = ({ size = 18 }) => (
  <View style={[styles.polDot, { width: size, height: size, borderRadius: size / 2 }]} />
);

const MOCK_SPECS = {
  c1: [
    { label: 'Color', value: 'Brown' },
    { label: 'Straps', value: 'Gold' },
  ],
  c2: [
    { label: 'Color', value: 'Blue' },
    { label: 'Straps', value: 'Silver' },
  ],
};

const MOCK_TRANSACTION = {
  currentOwner: 'Brand Owner',
  contract: '09ase1sd1sdnadmkasdhrnasdmkq3er1iqweqeqe1321s31er',
  from: 'NullAddress',
  to: 'Brand Owner',
};

const toBrandHandle = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  if (!normalized) {
    return 'Brand';
  }

  return `@${normalized}`;
};

const isListingWindowOpen = (listingDeadline) => {
  if (!listingDeadline) {
    return true;
  }

  const deadlineMs = new Date(listingDeadline).getTime();
  if (!Number.isFinite(deadlineMs)) {
    return true;
  }

  return deadlineMs > Date.now();
};

export default function CheckoutPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const {
    variantId,
    itemId,
    edition,
    total,
    price,
    name,
    image,
    brand,
    brandLogo,
    collection,
    productId,
    brandId,
    contractAddress,
    status,
    listingDeadline,
  } = params;

  const normalizedStatus = String(status || '').trim().toUpperCase();
  const isListedStatus = !normalizedStatus || normalizedStatus === 'LISTED';
  const isSaleWindowOpen = isListingWindowOpen(listingDeadline);
  const canProceedPayment = isListedStatus && isSaleWindowOpen;

  const brandHandle = toBrandHandle(brand);
  const transactionDetails = {
    currentOwner: brandHandle,
    contract: String(contractAddress || MOCK_TRANSACTION.contract),
    from: 'NullAddress',
    to: brandHandle,
  };

  const specs = MOCK_SPECS[variantId] ?? MOCK_SPECS.c1;

  const handleBuyItem = () => {
    if (!isListedStatus) {
      Alert.alert('Not Available Yet', 'This product is pre-minted but not listed yet, so it cannot be bought.');
      return;
    }

    if (!isSaleWindowOpen) {
      Alert.alert('Sale Ended', 'This collection sale window has ended, so this product can no longer be purchased.');
      return;
    }

    router.push({
      pathname: '/(tabs)/(collector)/marketplace/collection/product/payment',
      params: {
        itemId,
        edition,
        total,
        price,
        name,
        image,
        brand,
        brandLogo,
        collection,
        productId,
        brandId,
        contractAddress,
        status,
        listingDeadline,
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color="#111" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: image }}
            style={styles.itemImage}
            resizeMode="cover"
          />
          <View style={styles.authenticBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#fff" />
            <Text style={styles.authenticText}>Authentic</Text>
          </View>
        </View>

        {}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.itemName}>{name}</Text>
            <Text style={styles.itemId}>{itemId}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.collectionText}>{collection}</Text>
            <Text style={styles.metaBy}> by </Text>
            {brandLogo && (
              <Image
                source={{ uri: brandLogo }}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            )}
            <Text style={styles.brandText}>{brand}</Text>
          </View>

          <Text style={styles.editionText}>
            Edition {edition} of {total} Items in Collection
          </Text>

          {}
          <Text style={styles.sectionTitle}>Specification</Text>
          <View style={styles.specRow}>
            {specs.map((spec) => (
              <View key={spec.label} style={styles.specPill}>
                <Text style={styles.specPillText}>
                  <Text style={styles.specPillLabel}>{spec.label} : </Text>
                  {spec.value}
                </Text>
              </View>
            ))}
          </View>

          {}
          <Text style={styles.sectionTitle}>Latest Transaction Detail</Text>
          <View style={styles.transactionTable}>
            <TransactionRow label="Current Owner"       value={transactionDetails.currentOwner} />
            <TransactionRow label={`Blockchain\nContract`} value={transactionDetails.contract} />
            <TransactionRow label="From"                value={transactionDetails.from} />
            <TransactionRow label="To"                  value={transactionDetails.to} />
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {}
      <TouchableOpacity
        style={[styles.bottomBar, !canProceedPayment && styles.bottomBarDisabled]}
        onPress={handleBuyItem}
        activeOpacity={0.85}
        disabled={!canProceedPayment}
      >
        <View style={styles.bottomBarLeft}>
          <Text style={styles.bottomBarTitle}>
            {!isListedStatus ? 'Not Available Yet' : isSaleWindowOpen ? 'Buy Item' : 'Sale Ended'}
          </Text>
          <Text style={styles.bottomBarSub}>
            {!isListedStatus ? 'Waiting for listing' : isSaleWindowOpen ? `(${itemId})` : 'Listing period ended'}
          </Text>
        </View>
        <View style={styles.bottomBarRight}>
          <PolDot size={22} />
          <Text style={styles.bottomBarPolText}> POL {price}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const TransactionRow = ({ label, value }) => (
  <View style={styles.transactionRow}>
    <Text style={styles.transactionLabel}>{label}</Text>
    <Text style={styles.transactionValue} numberOfLines={2}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    gap: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  imageContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 280,
    borderRadius: 16,
  },
  authenticBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  authenticText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111',
  },
  itemId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
    flexWrap: 'wrap',
  },
  collectionText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  metaBy: {
    fontSize: 13,
    color: '#aaa',
  },
  brandLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f96a1b',
  },
  brandText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  editionText: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
    marginTop: 4,
  },
  specRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  specPill: {
    backgroundColor: '#111',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  specPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  specPillLabel: {
    fontWeight: '700',
  },
  transactionTable: {
    gap: 14,
  },
  transactionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  transactionLabel: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#555',
    fontWeight: '600',
    width: 110,
  },
  transactionValue: {
    fontSize: 13,
    color: '#111',
    flex: 1,
    fontWeight: '500',
  },
  polDot: {
    backgroundColor: '#7B3FE4',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 34,
  },
  bottomBarDisabled: {
    opacity: 0.6,
  },
  bottomBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomBarTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomBarSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
  },
  bottomBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomBarPolText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});