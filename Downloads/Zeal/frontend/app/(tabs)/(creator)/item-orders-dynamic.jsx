import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
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
import { orderService } from '@/services/orderService';
import { buildBackendQrUrl } from '@/services/qrService';
import LoadingPulse from '@/components/shared/loading-pulse';

const STATUS_CONFIG = {
  'In Process': { color: '#2980B9', icon: 'cube-outline', label: 'In Process' },
  'In Shipment': { color: '#E67E22', icon: 'car-outline', label: 'In Shipment' },
  'Wait for Claim': { color: '#8B5CF6', icon: 'hourglass-outline', label: 'Wait for Claim' },
  Completed: { color: '#27AE60', icon: 'checkmark-circle-outline', label: 'Completed' },
};

const CTA_BY_STATUS = {
  'In Process': { type: 'ship', label: 'Ship Item' },
  'In Shipment': { type: 'arrive-demo', label: 'Mark Arrived (Demo)' },
};

const PolDot = ({ size = 16 }) => (
  <View style={[styles.polDot, { width: size, height: size, borderRadius: size / 2 }]} />
);

const readParam = (value) => (Array.isArray(value) ? value[0] : value);

const QRSection = ({ item }) => {
  const [copied, setCopied] = useState(false);
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
          dialogTitle: `ZEAL QR - ${item.id}`,
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
    } catch (error) {
      console.error('QR Download error:', error);
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
        <View style={qrStyles.qrWrapper}>
          <Image
            source={{ uri: buildBackendQrUrl(item.qrValue, { size: 320, margin: 1 }) }}
            style={qrStyles.qrImage}
            resizeMode="contain"
          />
        </View>

        <View style={qrStyles.qrInfo}>
          <Text style={qrStyles.qrItemId}>{item.id}</Text>
          <Text style={qrStyles.qrItemName}>{item.name}</Text>
          <Text style={qrStyles.qrValueText} numberOfLines={1}>{item.qrValue}</Text>
        </View>

        <View style={qrStyles.actionRow}>
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

const TransactionRow = ({ label, value }) => (
  <View style={styles.transactionRow}>
    <Text style={styles.transactionLabel}>{label}</Text>
    <Text style={styles.transactionValue} numberOfLines={3}>{value}</Text>
  </View>
);

export default function CreatorOrderDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = readParam(params.orderId);

  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadOrderDetail = useCallback(async (showInitialLoader = true) => {
    if (!orderId) {
      setLoadError('Missing order id');
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
      const data = await orderService.getCreatorOrderDetail(orderId);
      setItem(data);
    } catch (error) {
      setItem(null);
      setLoadError(error?.message || 'Failed to load order detail');
    } finally {
      if (showInitialLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadOrderDetail(false);
  }, [loadOrderDetail]);

  const safeItem = useMemo(() => {
    if (item) return item;

    return {
      id: readParam(params.itemId) || '#--',
      name: readParam(params.itemName) || 'Order Item',
      collection: readParam(params.collection) || 'Collection',
      brand: 'Brand',
      brandLogo: '',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60',
      edition: 0,
      total: 0,
      specs: [],
      transaction: {
        currentOwner: '-',
        contract: '-',
        from: '-',
        to: '-',
        value: 'POL --',
        usd: '',
      },
      delivery: {
        status: 'In Process',
        claimedTime: '-',
        arrivalTime: '-',
        address: '-',
        recipientName: '-',
        phone: '-',
      },
      recipientName: '-',
      recipientPhone: '-',
      qrValue: 'digitalseal://order/unknown',
      statusSection: 'In Process',
    };
  }, [item, params.collection, params.itemId, params.itemName]);

  const status = safeItem.statusSection || safeItem.delivery?.status || 'In Process';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG['In Process'];
  const ctaConfig = CTA_BY_STATUS[status] || null;
  const hasBackendQrPayload = Boolean(String(safeItem?.qrValue || '').trim());

  const handleStatusAction = async () => {
    if (!ctaConfig || !safeItem.orderId || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      if (ctaConfig.type === 'process') {
        await orderService.processCreatorOrder(safeItem.orderId);
      } else if (ctaConfig.type === 'ship') {
        await orderService.shipCreatorOrder(safeItem.orderId);
      } else if (ctaConfig.type === 'arrive-demo') {
        await orderService.markCreatorOrderArrivedDemo(safeItem.orderId);
      }

      await loadOrderDetail();
      Alert.alert('Success', `${ctaConfig.label} completed.`);
    } catch (error) {
      Alert.alert('Action failed', error?.message || 'Unable to update order status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerWrap}>
        <LoadingPulse label="Loading order details..." />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centerWrap}>
        <Ionicons name="alert-circle-outline" size={44} color="#B03A2E" />
        <Text style={styles.centerText}>{loadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#111" />
        }
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: safeItem.image }}
            style={styles.itemImage}
            resizeMode="cover"
          />
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={13} color="#111" />
              <Text style={styles.badgeText}>Authentic</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="business-outline" size={13} color="#111" />
              <Text style={styles.badgeText}>Creator View</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusConfig.color }]}>
              <Ionicons name={statusConfig.icon} size={13} color="#fff" />
              <Text style={[styles.badgeText, { color: '#fff' }]}>{statusConfig.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.itemName}>{safeItem.name}</Text>
            <Text style={styles.itemId}>{safeItem.id}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.collectionText}>{safeItem.collection}</Text>
            <Text style={styles.metaBy}> by </Text>
            {!!safeItem.brandLogo && (
              <Image source={{ uri: safeItem.brandLogo }} style={styles.brandLogo} resizeMode="contain" />
            )}
            <Text style={styles.brandText}>{safeItem.brand}</Text>
          </View>

          <Text style={styles.editionText}>
            Edition {safeItem.edition || 0} of {safeItem.total || 0} Items in Collection
          </Text>

          <Text style={styles.sectionTitle}>Specification</Text>
          <View style={styles.specRow}>
            {safeItem.specs.map((spec) => (
              <View key={spec.label} style={styles.specPill}>
                <Text style={styles.specPillText}>
                  <Text style={styles.specPillLabel}>{spec.label} : </Text>
                  {spec.value}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Latest Transaction Detail</Text>
          <View style={styles.transactionTable}>
            <TransactionRow label="Current Owner" value={safeItem.transaction.currentOwner} />
            <TransactionRow label={`Blockchain\nContract`} value={safeItem.transaction.contract} />
            <TransactionRow label="From" value={safeItem.transaction.from} />
            <TransactionRow label="To" value={safeItem.transaction.to} />
            <View style={styles.transactionRow}>
              <Text style={styles.transactionLabel}>Transaction{'\n'}Value</Text>
              <View style={styles.transactionValueRow}>
                <PolDot size={16} />
                <Text style={styles.transactionValue}> {safeItem.transaction.value}</Text>
                {!!safeItem.transaction.usd && (
                  <Text style={styles.transactionUsd}>  {safeItem.transaction.usd}</Text>
                )}
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <View style={styles.transactionTable}>
            <TransactionRow label="Status" value={safeItem.delivery.status} />
            {status === 'Completed' ? (
              <TransactionRow label="Claimed Time" value={safeItem.delivery.claimedTime} />
            ) : (
              <TransactionRow label={`Arrival Time\nEstimation`} value={safeItem.delivery.arrivalTime} />
            )}
            <TransactionRow label="Address" value={safeItem.delivery.address} />
            <TransactionRow label="Recepient Name" value={safeItem.recipientName || safeItem.delivery.recipientName} />
            <TransactionRow label="Phone Number" value={safeItem.recipientPhone || safeItem.delivery.phone} />
          </View>

          {status === 'Completed' && hasBackendQrPayload && <QRSection item={safeItem} />}

          <View style={{ height: ctaConfig ? 100 : 56 }} />
        </View>
      </ScrollView>

      {ctaConfig && (
        <SafeAreaView edges={['bottom']} style={styles.bottomActionWrap}>
          <TouchableOpacity
            style={[styles.bottomActionButton, isSubmitting && styles.bottomActionButtonDisabled]}
            onPress={handleStatusAction}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.bottomActionText}>
              {isSubmitting ? 'Please wait...' : ctaConfig.label}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerWrap: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 10 },
  centerText: { fontSize: 13, color: '#555' },
  retryBtn: { backgroundColor: '#111', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginTop: 6 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bottomActionWrap: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  bottomActionButton: {
    backgroundColor: '#111',
    borderRadius: 10,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActionButtonDisabled: {
    opacity: 0.7,
  },
  bottomActionText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

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

  imageContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  itemImage: { width: '100%', height: 220, borderRadius: 16 },
  badgeRow: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#111' },

  body: { paddingHorizontal: 16, paddingTop: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  itemName: { fontSize: 22, fontWeight: '900', color: '#111' },
  itemId: { fontSize: 13, fontWeight: '600', color: '#888' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
    flexWrap: 'wrap',
  },
  collectionText: { fontSize: 13, color: '#555', fontWeight: '500' },
  metaBy: { fontSize: 13, color: '#aaa' },
  brandLogo: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f96a1b' },
  brandText: { fontSize: 13, color: '#555', fontWeight: '600' },
  editionText: { fontSize: 13, color: '#888', marginTop: 2, marginBottom: 20 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12, marginTop: 4 },
  specRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 24 },
  specPill: { backgroundColor: '#111', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 8 },
  specPillText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  specPillLabel: { fontWeight: '700' },

  transactionTable: { gap: 14, marginBottom: 24 },
  transactionRow: { flexDirection: 'row', gap: 16 },
  transactionLabel: { fontSize: 13, fontStyle: 'italic', color: '#555', fontWeight: '600', width: 110 },
  transactionValue: { fontSize: 13, color: '#111', flex: 1, fontWeight: '500' },
  transactionValueRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  transactionUsd: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  polDot: { backgroundColor: '#7B3FE4' },
});

const qrStyles = StyleSheet.create({
  section: { marginBottom: 24, gap: 8 },
  subtitle: { fontSize: 13, color: '#888' },
  qrCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  qrWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  qrImage: {
    width: 160,
    height: 160,
  },
  qrInfo: { alignItems: 'center', gap: 2 },
  qrItemId: { fontSize: 13, fontWeight: '700', color: '#111' },
  qrItemName: { fontSize: 12, color: '#555' },
  qrValueText: { fontSize: 10, color: '#aaa' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#ddd',
  },
  actionBtnSuccess: { backgroundColor: '#27AE60', borderColor: '#27AE60' },
  actionBtnDark: { backgroundColor: '#111', borderColor: '#111' },
  actionBtnDisabled: { backgroundColor: '#aaa', borderColor: '#aaa' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#111' },
  infoNote: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#EBF5FB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#AED6F1',
  },
  infoNoteText: { flex: 1, fontSize: 11, color: '#2980B9', lineHeight: 16 },
});
