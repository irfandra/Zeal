
import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActionSheetIOS, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera } from 'expo-camera';

const SOURCES = [
  {
    id: 'rack',
    icon: 'cube-outline',
    color: '#2980B9',
    title: 'From Your Rack',
    desc: 'Select an NFT item you already own.',
  },
  {
    id: 'marketplace',
    icon: 'storefront-outline',
    color: '#8E44AD',
    title: 'From Marketplace',
    desc: 'Browse collections and catalog items.',
  },
  {
    id: 'scan',
    icon: 'qr-code-outline',
    color: '#27AE60',
    title: 'Scan NFT QR',
    desc: 'Scan the NFT QR code from the item detail page.',
  },
  {
    id: 'upload',
    icon: 'cloud-upload-outline',
    color: '#E67E22',
    title: 'Upload QR Image',
    desc: 'Upload a QR image from your gallery or files.',
  },
];

const QR_ITEM_MAP = {
  'zeal://item/AZEDR/transfer': {
    id: '#AZEDR',
    name: 'Charizard',
    subtitle: 'Pokemon Card',
    tag: 'Limited',
    tagColor: '#C9A23C',
    price: 'POL 120,100',
    usd: '~$11,000',
    brand: 'Nintendo',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Nintendo.svg/200px-Nintendo.svg.png',
    image: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=800&q=60',
    labelQR: 'zeal://item/AZEDR/label',
    certificateQR: 'zeal://item/AZEDR/certificate',
  },
  'zeal://item/BK291/transfer': {
    id: '#BK291',
    name: 'Birkin Brownies',
    subtitle: 'Luxury Bag',
    tag: 'Rare',
    tagColor: '#B8860B',
    price: 'POL 104,192',
    usd: '~$10,000',
    brand: 'Hermès',
    brandLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Hermes_paris_logo.svg/200px-Hermes_paris_logo.svg.png',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=60',
    labelQR: 'zeal://item/BK291/label',
    certificateQR: 'zeal://item/BK291/certificate',
  },
};

export default function SelectNFTPage() {
  const router = useRouter();

  const handleSelectItem = (item) => {
    router.navigate({
      pathname: '/authcheck',
      params: { selectedItem: encodeURIComponent(JSON.stringify(item)) },
    });
  };

  const decodeQRFromUri = async (uri) => {
    try {
      const decoded = await Camera.scanFromURLAsync(uri);
      if (!decoded || decoded.length === 0) {
        Alert.alert('No QR Found', 'Could not detect a QR code. Try a clearer image.');
        return;
      }
      const data = decoded[0].data;
      const item = QR_ITEM_MAP[data];
      if (item) {
        handleSelectItem(item);
      } else {
        Alert.alert('Unknown QR', 'This QR does not match any known NFT item.');
      }
    } catch {
      Alert.alert('Error', 'Failed to read the image. Please try again.');
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, quality: 1,
    });
    if (!result.canceled) await decodeQRFromUri(result.assets[0].uri);
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Select NFT</Text>
        <Text style={styles.pageSubtitle}>
          Choose how you&apos;d like to select the NFT item to verify.
        </Text>

        <View style={styles.sourceList}>
          {SOURCES.map((source) => (
            <TouchableOpacity
              key={source.id}
              style={styles.sourceCard}
              onPress={() => handleSource(source.id)}
              activeOpacity={0.85}
            >
              <View style={[styles.sourceIconBox, { backgroundColor: source.color + '18' }]}>
                <Ionicons name={source.icon} size={26} color={source.color} />
              </View>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceTitle}>{source.title}</Text>
                <Text style={styles.sourceDesc}>{source.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  scroll:       { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  pageTitle:    { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 6 },
  pageSubtitle: { fontSize: 14, color: '#888', marginBottom: 28, lineHeight: 20 },

  sourceList: { gap: 12 },
  sourceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#f9f9f9', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#f0f0f0',
  },
  sourceIconBox: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sourceInfo:  { flex: 1, gap: 3 },
  sourceTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  sourceDesc:  { fontSize: 13, color: '#888', lineHeight: 18 },
});