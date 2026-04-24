
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Buffer } from 'buffer';
import { rackService } from '@/services/rackService';
import { buildBackendQrUrl } from '@/services/qrService';

const MOCK_ITEMS = {
  '#AZEDR': {
    id: '#AZEDR',
    name: 'Birkin Brownies',
    collection: 'Birkin Collections',
    brand: 'Hermès',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hermes_paris_logo.svg/200px-Hermes_paris_logo.svg.png',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60',
    edition: 124,
    total: 450,
    specs: [
      { label: 'Color', value: 'Blue' },
      { label: 'Straps', value: 'Gold' },
    ],
    transaction: {
      currentOwner: '@glimpse27',
      contract: '09ase1sd1sdnadmkasdhrnasdmkq3er1iqweqeqe1321s31er',
      from: '@hermes',
      to: '@glimpse27',
      value: 'POL 120,100',
      usd: '~$11,000',
    },
    delivery: {
      status: 'Claimed',
      claimedTime: '14/03/2026',
      address: 'Jurong East Ave 1, Building 37 Unit 13-01 , Singapore, 609784',
      recipientName: 'Gerry Julian',
      phone: '+65 23234134',
    },
    qrValue: 'zeal://item/AZEDR/transfer',
  },
  '#BK291': {
    id: '#BK291',
    name: 'Birkin Brownies',
    collection: 'Birkin Collections',
    brand: 'Hermès',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hermes_paris_logo.svg/200px-Hermes_paris_logo.svg.png',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60',
    edition: 124,
    total: 450,
    specs: [
      { label: 'Color', value: 'Blue' },
      { label: 'Straps', value: 'Gold' },
    ],
    transaction: {
      currentOwner: '@glimpse27',
      contract: '09ase1sd1sdnadmkasdhrnasdmkq3er1iqweqeqe1321s31er',
      from: '@hermes',
      to: '@glimpse27',
      value: 'POL 120,100',
      usd: '~$11,000',
    },
    delivery: {
      status: 'In Process',
      arrivalTime: '14/03/2026',
      address: 'Jurong East Ave 1, Building 37 Unit 13-01 , Singapore, 609784',
      recipientName: 'Gerry Julian',
      phone: '+65 23234134',
    },
    qrValue: 'zeal://item/BK291/transfer',
  },
  '#NK412': {
    id: '#NK412',
    name: 'AJ1 Chicago',
    collection: 'Air Jordan 1 Series',
    brand: 'Nike',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/200px-Logo_NIKE.svg.png',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=60',
    edition: 50,
    total: 300,
    specs: [
      { label: 'Color', value: 'Chicago Red' },
      { label: 'Size', value: 'US 10' },
    ],
    transaction: {
      currentOwner: '@glimpse27',
      contract: '09ase1sd1sdnadmkasdhrnasdmkq3er1iqweqeqe1321s31er',
      from: '@nike',
      to: '@glimpse27',
      value: 'POL 25,000',
      usd: '~$2,400',
    },
    delivery: {
      status: 'In Shipment',
      arrivalTime: '20/03/2026',
      address: 'Jurong East Ave 1, Building 37 Unit 13-01 , Singapore, 609784',
      recipientName: 'Gerry Julian',
      phone: '+65 23234134',
    },
    qrValue: 'zeal://item/NK412/transfer',
  },
  '#LG088': {
    id: '#LG088',
    name: 'Falcon Standard',
    collection: 'Millennium Falcon',
    brand: 'LEGO',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/LEGO_logo.svg/200px-LEGO_logo.svg.png',
    image: 'https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=800&q=60',
    edition: 30,
    total: 80,
    specs: [
      { label: 'Edition', value: 'Standard' },
      { label: 'Pieces', value: '7541' },
    ],
    transaction: {
      currentOwner: '@glimpse27',
      contract: '09ase1sd1sdnadmkasdhrnasdmkq3er1iqweqeqe1321s31er',
      from: '@lego',
      to: '@glimpse27',
      value: 'POL 10,500',
      usd: '~$1,000',
    },
    delivery: {
      status: 'In Process',
      arrivalTime: '01/04/2026',
      address: 'Jurong East Ave 1, Building 37 Unit 13-01 , Singapore, 609784',
      recipientName: 'Gerry Julian',
      phone: '+65 23234134',
    },
    qrValue: 'zeal://item/LG088/transfer',
  },
};

const STATUS_CONFIG = {
  'In Process': { color: '#2980B9', icon: 'cube-outline', label: 'In Process' },
  'In Shipment': { color: '#E67E22', icon: 'car-outline', label: 'In Shipment' },
  'Wait for Claim': { color: '#8B5CF6', icon: 'hourglass-outline', label: 'Wait for Claim' },
  Claimed: { color: '#27AE60', icon: 'checkmark-circle-outline', label: 'Claimed' },
};

const PolDot = ({ size = 16 }) => (
  <View style={[styles.polDot, { width: size, height: size, borderRadius: size / 2 }]} />
);

const QRSection = ({ item }) => {
  const [copied,      setCopied]      = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(item.qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);

      const qrUrl = buildBackendQrUrl(item.qrValue, { size: 300, margin: 1 });

      const response = await fetch(qrUrl);
      if (!response.ok) throw new Error('Failed to fetch QR image');

      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      const base64Encoded = Buffer.from(binary, 'binary').toString('base64');
      const base64 = `data:image/png;base64,${base64Encoded}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8"/>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, Helvetica, sans-serif;
                background: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 60px 40px;
              }
              .card {
                border: 2px solid #111;
                border-radius: 20px;
                padding: 36px 28px;
                text-align: center;
                width: 100%;
                max-width: 400px;
              }
              .logo {
                font-size: 24px;
                font-weight: 900;
                letter-spacing: 3px;
                color: #111;
                margin-bottom: 20px;
              }
              .divider {
                height: 1px;
                background: #f0f0f0;
                margin: 16px 0;
              }
              .brand {
                font-size: 11px;
                color: #aaa;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                margin-bottom: 4px;
              }
              .name {
                font-size: 24px;
                font-weight: 700;
                color: #111;
                margin-bottom: 4px;
              }
              .item-id {
                font-size: 13px;
                color: #888;
                margin-bottom: 28px;
              }
              .qr-wrapper {
                background: #fff;
                border: 1px solid #eee;
                border-radius: 16px;
                padding: 20px;
                display: inline-block;
                margin-bottom: 20px;
              }
              img {
                width: 240px;
                height: 240px;
                display: block;
              }
              .qr-label {
                font-size: 10px;
                color: #bbb;
                word-break: break-all;
                margin-bottom: 24px;
                padding: 0 8px;
              }
              .footer {
                font-size: 12px;
                color: #888;
                line-height: 1.6;
              }
              .footer strong { color: #111; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">ZEAL</div>
              <div class="divider"></div>
              <div class="brand">${item.brand}</div>
              <div class="name">${item.name}</div>
              <div class="item-id">${item.id}</div>
              <div class="qr-wrapper">
                <img src="${base64}" />
              </div>
              <div class="qr-label">${item.qrValue}</div>
              <div class="divider"></div>
              <div class="footer">
                Scan this QR code to verify and<br/>
                <strong>transfer ownership on ZEAL</strong>
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 595,
        height: 842,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `ZEAL QR — ${item.id}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
        if (permission.granted) {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert('Saved!', 'QR code saved to your Files.');
        } else {
          Alert.alert('Error', 'Cannot save file. Permission denied.');
        }
      }
    } catch (err) {
      console.error('QR Download error:', err);
      Alert.alert(
        'Download Failed',
        'Could not generate QR. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={qrStyles.section}>
      <Text style={styles.sectionTitle}>QR Code</Text>
      <Text style={qrStyles.subtitle}>Scan this QR for transfer of ownership</Text>

      <View style={qrStyles.qrCard}>

        {}
        <View style={qrStyles.qrWrapper}>
          <Image
            source={{ uri: buildBackendQrUrl(item.qrValue, { size: 320, margin: 1 }) }}
            style={qrStyles.qrImage}
            resizeMode="contain"
          />
        </View>

        {}
        <View style={qrStyles.qrInfo}>
          <Text style={qrStyles.qrItemId}>{item.id}</Text>
          <Text style={qrStyles.qrItemName}>{item.name}</Text>
          <Text style={qrStyles.qrValueText} numberOfLines={1}>{item.qrValue}</Text>
        </View>

        {}
        <View style={qrStyles.actionRow}>

          {}
          <TouchableOpacity
            style={[qrStyles.actionBtn, copied && qrStyles.actionBtnSuccess]}
            onPress={handleCopy}
          >
            <Ionicons
              name={copied ? 'checkmark-outline' : 'copy-outline'}
              size={16}
              color={copied ? '#fff' : '#111'}
            />
            <Text style={[qrStyles.actionBtnText, copied && { color: '#fff' }]}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>

          {}
          <TouchableOpacity
            style={[
              qrStyles.actionBtn,
              qrStyles.actionBtnDark,
              downloading && qrStyles.actionBtnDisabled,
            ]}
            onPress={downloading ? null : handleDownload}
            activeOpacity={0.85}
          >
            <Ionicons
              name={downloading ? 'hourglass-outline' : 'download-outline'}
              size={16}
              color="#fff"
            />
            <Text style={[qrStyles.actionBtnText, { color: '#fff' }]}>
              {downloading ? 'Generating...' : 'Download'}
            </Text>
          </TouchableOpacity>
        </View>

        {}
        <View style={qrStyles.infoNote}>
          <Ionicons name="information-circle-outline" size={14} color="#2980B9" />
          <Text style={qrStyles.infoNoteText}>
            Download generates a PDF with a scannable QR code. Share it with the receiver to complete the transfer.
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function ItemDetailPage() {
  const router = useRouter();
  const { itemId } = useLocalSearchParams();
  const decodedItemId = decodeURIComponent(String(itemId || ''));
  const [item, setItem] = useState(MOCK_ITEMS[decodedItemId] || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRetryKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadItemDetail = async () => {
      setLoading(true);
      setError('');

      try {
        const detail = await rackService.getCollectorRackItemDetail(decodedItemId, {
          forceRefresh: retryKey > 0,
        });

        if (!isActive) {
          return;
        }

        setItem(detail);
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        const fallbackItem = MOCK_ITEMS[decodedItemId] || null;
        setItem(fallbackItem);

        if (!fallbackItem) {
          setError(loadError?.message || 'Failed to load item details.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadItemDetail();

    return () => {
      isActive = false;
    };
  }, [decodedItemId, retryKey]);

  if (loading && !item) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  if (!loading && (!item || error)) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="alert-circle-outline" size={46} color="#E74C3C" />
        <Text style={styles.errorText}>{error || 'Owned item not found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => setRetryKey((value) => value + 1)}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backRackBtn} onPress={() => router.replace('/(tabs)/(collector)/rack')}>
          <Text style={styles.backRackBtnText}>Back to Rack</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = item?.delivery?.status || 'Claimed';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.Claimed;
  const hasBackendQrPayload = Boolean(String(item?.qrValue || '').trim());

  return (
    <View style={styles.container}>

      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/(collector)/rack')}>
            <Ionicons name="arrow-back" size={24} color="#111" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#111"
          />
        }
      >

        {}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image }}
            style={styles.itemImage}
            resizeMode="cover"
          />
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={13} color="#111" />
              <Text style={styles.badgeText}>Authentic</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="person-circle-outline" size={13} color="#111" />
              <Text style={styles.badgeText}>Your Item</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusConfig.color }]}>
              <Ionicons name={statusConfig.icon} size={13} color="#fff" />
              <Text style={[styles.badgeText, { color: '#fff' }]}>{statusConfig.label}</Text>
            </View>
          </View>
        </View>

        {}
        <View style={styles.body}>

          <View style={styles.titleRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemId}>{item.id}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.collectionText}>{item.collection}</Text>
            <Text style={styles.metaBy}> by </Text>
            <Image source={{ uri: item.brandLogo }} style={styles.brandLogo} resizeMode="contain" />
            <Text style={styles.brandText}>{item.brand}</Text>
          </View>
          <Text style={styles.editionText}>
            Edition {item.edition} of {item.total} Items in Collection
          </Text>

          {}
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

          {}
          <Text style={styles.sectionTitle}>Latest Transaction Detail</Text>
          <View style={styles.transactionTable}>
            <TransactionRow label="Current Owner"          value={item.transaction.currentOwner} />
            <TransactionRow label={`Blockchain\nContract`} value={item.transaction.contract} />
            <TransactionRow label="From"                   value={item.transaction.from} />
            <TransactionRow label="To"                     value={item.transaction.to} />
            <View style={styles.transactionRow}>
              <Text style={styles.transactionLabel}>Transaction{'\n'}Value</Text>
              <View style={styles.transactionValueRow}>
                <PolDot size={16} />
                <Text style={styles.transactionValue}> {item.transaction.value}</Text>
                <Text style={styles.transactionUsd}>  {item.transaction.usd}</Text>
              </View>
            </View>
          </View>

          {}
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <View style={styles.transactionTable}>
            <TransactionRow label="Status" value={item.delivery.status} />
            {status === 'Claimed' ? (
              <TransactionRow label="Claimed Time" value={item.delivery.claimedTime} />
            ) : (
              <TransactionRow label={`Arrival Time\nEstimation`} value={item.delivery.arrivalTime} />
            )}
            <TransactionRow label="Address"        value={item.delivery.address} />
            <TransactionRow label="Recepient Name" value={item.delivery.recipientName} />
            <TransactionRow label="Phone Number"   value={item.delivery.phone} />
          </View>

          {}
          {status === 'Claimed' && hasBackendQrPayload && <QRSection item={item} />}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {}
      {status === 'Wait for Claim' && (
        <TouchableOpacity
          style={styles.claimBtn}
          onPress={() =>
            router.push(`/(tabs)/item/${encodeURIComponent(item.id)}/claimownership`)
          }
        >
          <Text style={styles.claimBtnText}>Claim Ownership</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const TransactionRow = ({ label, value }) => (
  <View style={styles.transactionRow}>
    <Text style={styles.transactionLabel}>{label}</Text>
    <Text style={styles.transactionValue} numberOfLines={3}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fff' },
  centerState: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: '#111',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  backRackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backRackBtnText: {
    color: '#111',
    fontSize: 13,
    fontWeight: '600',
  },
  headerBar: {
    height: 44, paddingHorizontal: 16,
    justifyContent: 'center', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingVertical: 8, paddingHorizontal: 4,
  },
  backText:       { fontSize: 17, fontWeight: '600', color: '#111' },
  imageContainer: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, overflow: 'hidden', position: 'relative',
  },
  itemImage:  { width: '100%', height: 220, borderRadius: 16 },
  badgeRow: {
    position: 'absolute', bottom: 14, left: 14,
    flexDirection: 'row', gap: 8, flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  badgeText:      { fontSize: 11, fontWeight: '700', color: '#111' },
  body:           { paddingHorizontal: 16, paddingTop: 16 },
  titleRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  itemName:       { fontSize: 22, fontWeight: '900', color: '#111' },
  itemId:         { fontSize: 13, fontWeight: '600', color: '#888' },
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 4, gap: 4, flexWrap: 'wrap',
  },
  collectionText: { fontSize: 13, color: '#555', fontWeight: '500' },
  metaBy:         { fontSize: 13, color: '#aaa' },
  brandLogo:      { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f96a1b' },
  brandText:      { fontSize: 13, color: '#555', fontWeight: '600' },
  editionText:    { fontSize: 13, color: '#888', marginTop: 2, marginBottom: 20 },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12, marginTop: 4 },
  specRow:        { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 24 },
  specPill:       { backgroundColor: '#111', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 8 },
  specPillText:   { color: '#fff', fontSize: 13, fontWeight: '500' },
  specPillLabel:  { fontWeight: '700' },
  transactionTable: { gap: 14, marginBottom: 24 },
  transactionRow:   { flexDirection: 'row', gap: 16 },
  transactionLabel: { fontSize: 13, fontStyle: 'italic', color: '#555', fontWeight: '600', width: 110 },
  transactionValue: { fontSize: 13, color: '#111', flex: 1, fontWeight: '500' },
  transactionValueRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  transactionUsd: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  polDot:         { backgroundColor: '#7B3FE4' },
  claimBtn: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#111', paddingVertical: 18,
    paddingBottom: 34, alignItems: 'center',
  },
  claimBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

const qrStyles = StyleSheet.create({
  section:  { marginBottom: 24, gap: 8 },
  subtitle: { fontSize: 13, color: '#888' },
  qrCard: {
    backgroundColor: '#f9f9f9', borderRadius: 16,
    padding: 20, gap: 14,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  qrWrapper: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, alignSelf: 'center',
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  qrImage: { width: 160, height: 160 },
  qrInfo:       { alignItems: 'center', gap: 2 },
  qrItemId:     { fontSize: 13, fontWeight: '700', color: '#111' },
  qrItemName:   { fontSize: 12, color: '#555' },
  qrValueText:  { fontSize: 10, color: '#aaa' },
  actionRow:    { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#ddd',
  },
  actionBtnSuccess:  { backgroundColor: '#27AE60', borderColor: '#27AE60' },
  actionBtnDark:     { backgroundColor: '#111', borderColor: '#111' },
  actionBtnDisabled: { backgroundColor: '#aaa', borderColor: '#aaa' },
  actionBtnText:     { fontSize: 13, fontWeight: '700', color: '#111' },
  infoNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#EBF5FB', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#AED6F1',
  },
  infoNoteText: { flex: 1, fontSize: 11, color: '#2980B9', lineHeight: 16 },
});