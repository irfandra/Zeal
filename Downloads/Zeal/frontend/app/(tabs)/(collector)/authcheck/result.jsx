
import React from 'react';
import {
  View, Text, Image, TouchableOpacity,
  ScrollView, StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const PolDot = ({ size = 16 }) => (
  <View style={[styles.polDot, { width: size, height: size, borderRadius: size / 2 }]} />
);

const TransactionRow = ({ label, value, children }) => (
  <View style={styles.txRow}>
    <Text style={styles.txLabel}>{label}</Text>
    {children ?? <Text style={styles.txValue}>{value}</Text>}
  </View>
);

export default function AuthResultPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const isAuthentic = params.result === 'authentic';
  const item = params.itemData
    ? JSON.parse(decodeURIComponent(params.itemData))
    : null;

  const handleCheckAnother = () => {
    router.navigate('/authcheck');
  };

  if (!item) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#E74C3C" />
        <Text style={styles.errorText}>No result data found.</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={handleCheckAnother}>
          <Text style={styles.resetBtnText}>Check Another Item</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

        <View style={styles.headerBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111" />
            <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
        </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.pageTitle}>Authentication Result</Text>

        {}
        <View style={[
          styles.imageContainer,
          isAuthentic ? styles.imageContainerAuthentic : styles.imageContainerFake,
        ]}>
          <Image
            source={{ uri: item.image }}
            style={styles.itemImage}
            resizeMode="cover"
          />
          <View style={styles.badgeRow}>
            <View style={[styles.badge, isAuthentic ? styles.badgeGreen : styles.badgeRed]}>
              <Ionicons
                name={isAuthentic ? 'shield-checkmark' : 'close-circle'}
                size={13}
                color={isAuthentic ? '#166534' : '#991B1B'}
              />
              <Text style={[styles.badgeText, { color: isAuthentic ? '#166534' : '#991B1B' }]}>
                {isAuthentic ? 'Authentic' : 'Not Authentic'}
              </Text>
            </View>
            {item.status && (
              <>
                <View style={styles.badge}>
                  <Ionicons name="person-circle-outline" size={13} color="#111" />
                  <Text style={styles.badgeText}>Your Item</Text>
                </View>
                <View style={styles.badge}>
                  <Ionicons name="checkmark-circle-outline" size={13} color="#111" />
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {}
        <View style={styles.itemInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemId}>{item.id}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaCollection}>
              {item.collection ?? item.subtitle}
            </Text>
            <Text style={styles.metaBy}> by </Text>
            {item.brandLogo && (
              <Image
                source={{ uri: item.brandLogo }}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            )}
            <Text style={styles.metaBrand}>{item.brand}</Text>
          </View>
          {item.edition && (
            <Text style={styles.editionText}>{item.edition}</Text>
          )}
        </View>

        {}
        <View style={[
          styles.resultBanner,
          {
            backgroundColor: isAuthentic ? '#F0FDF4' : '#FEF2F2',
            borderColor:      isAuthentic ? '#BBF7D0' : '#FECACA',
          },
        ]}>
          <View style={[
            styles.resultIconBox,
            { backgroundColor: isAuthentic ? '#27AE60' : '#E74C3C' },
          ]}>
            <Ionicons
              name={isAuthentic ? 'shield-checkmark' : 'close-circle'}
              size={22} color="#fff"
            />
          </View>
          <View style={styles.resultTextBox}>
            <Text style={[
              styles.resultBannerTitle,
              { color: isAuthentic ? '#166534' : '#991B1B' },
            ]}>
              {isAuthentic ? 'Verified Authentic' : 'Verification Failed'}
            </Text>
            <Text style={[
              styles.resultBannerDesc,
              { color: isAuthentic ? '#166534' : '#991B1B' },
            ]}>
              {isAuthentic
                ? 'This item has been verified as authentic on the ZEAL blockchain.'
                : 'This item could not be verified. The QR codes do not match.'
              }
            </Text>
          </View>
        </View>

        {}
        {item.specs && item.specs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Specification</Text>
            <View style={styles.specRow}>
              {item.specs.map((spec) => (
                <View key={spec.label} style={styles.specPill}>
                  <Text style={styles.specPillText}>
                    <Text style={styles.specPillLabel}>{spec.label} : </Text>
                    {spec.value}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {}
        {item.transaction && (
          <>
            <Text style={styles.sectionTitle}>Latest Transaction Detail</Text>
            <View style={styles.txTable}>
              <TransactionRow
                label="Current Owner"
                value={item.transaction.currentOwner}
              />
              <TransactionRow
                label={`Blockchain\nContract`}
                value={item.transaction.contract}
              />
              <TransactionRow
                label="From"
                value={item.transaction.from}
              />
              <TransactionRow
                label="To"
                value={item.transaction.to}
              />
              <View style={styles.txRow}>
                <Text style={styles.txLabel}>Transaction{'\n'}Value</Text>
                <View style={styles.txValueRow}>
                  <PolDot size={16} />
                  <Text style={styles.txValueText}> {item.transaction.value}</Text>
                  <Text style={styles.txUsd}>  {item.transaction.usd}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {}
        <TouchableOpacity style={styles.resetBtn} onPress={handleCheckAnother}>
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.resetBtnText}>Check Another Item</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#fff' },
  errorContainer: {
    flex: 1, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16,
  },
  errorText: { fontSize: 15, color: '#E74C3C', fontWeight: '600' },

  headerBar: {
    height: 44, paddingHorizontal: 16,
    justifyContent: 'center', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8,
  },
  backText:  { fontSize: 17, fontWeight: '600', color: '#111' },
  scroll:    { paddingHorizontal: 16, paddingTop: 16 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: '#111', marginBottom: 16 },

  imageContainer: {
    borderRadius: 16, overflow: 'hidden',
    marginBottom: 16, borderWidth: 2,
  },
  imageContainerAuthentic: { borderColor: '#27AE60' },
  imageContainerFake:      { borderColor: '#E74C3C' },
  itemImage: { width: '100%', height: 240 },
  badgeRow: {
    position: 'absolute', bottom: 14, left: 14,
    flexDirection: 'row', gap: 8, flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  badgeGreen: { backgroundColor: 'rgba(240,253,244,0.95)' },
  badgeRed:   { backgroundColor: 'rgba(254,242,242,0.95)' },
  badgeText:  { fontSize: 11, fontWeight: '700', color: '#111' },

  itemInfo:       { marginBottom: 16 },
  titleRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
  itemName:       { fontSize: 22, fontWeight: '900', color: '#111' },
  itemId:         { fontSize: 13, fontWeight: '600', color: '#888' },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 4 },
  metaCollection: { fontSize: 13, color: '#555', fontWeight: '500' },
  metaBy:         { fontSize: 13, color: '#aaa' },
  brandLogo:      { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f96a1b' },
  metaBrand:      { fontSize: 13, color: '#555', fontWeight: '600' },
  editionText:    { fontSize: 13, color: '#888' },

  resultBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20,
  },
  resultIconBox: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  resultTextBox:     { flex: 1, gap: 3 },
  resultBannerTitle: { fontSize: 14, fontWeight: '800' },
  resultBannerDesc:  { fontSize: 12, lineHeight: 18 },

  sectionTitle:  { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12, marginTop: 4 },
  specRow:       { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 24 },
  specPill:      { backgroundColor: '#111', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 8 },
  specPillText:  { color: '#fff', fontSize: 13, fontWeight: '500' },
  specPillLabel: { fontWeight: '700' },

  txTable:    { gap: 14, marginBottom: 24 },
  txRow:      { flexDirection: 'row', gap: 16 },
  txLabel:    { fontSize: 13, fontStyle: 'italic', color: '#555', fontWeight: '600', width: 110 },
  txValue:    { fontSize: 13, color: '#111', flex: 1, fontWeight: '500' },
  txValueRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  txValueText: { fontSize: 13, color: '#111', fontWeight: '700' },
  txUsd:      { fontSize: 12, color: '#888', fontStyle: 'italic' },
  polDot:     { backgroundColor: '#7B3FE4' },

  resetBtn: {
    backgroundColor: '#111', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center',
    gap: 8, marginTop: 8,
  },
  resetBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});