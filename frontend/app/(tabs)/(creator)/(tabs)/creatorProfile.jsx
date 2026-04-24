import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { brandService } from '@/services/brandService';
import LoadingPulse from '@/components/shared/loading-pulse';

const DEFAULT_LOGO = '';

const truncateWallet = (value) => {
  const wallet = String(value || '').trim();
  if (!wallet) return '-';
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
};

const getFileName = (url) => {
  if (!url) return 'No request letter uploaded';
  try {
    const withoutQuery = url.split('?')[0];
    return decodeURIComponent(withoutQuery.substring(withoutQuery.lastIndexOf('/') + 1));
  } catch (_error) {
    return 'Request Letter.pdf';
  }
};

const toBrandHandle = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  if (!normalized) {
    return '@brand';
  }

  return `@${normalized}`;
};

export default function CreatorProfileScreen() {
  const router = useRouter();
  const [brand, setBrand] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadProfile = useCallback(async (showInitialLoader = true) => {
    try {
      if (showInitialLoader) {
        setIsLoading(true);
      }
      setLoadError('');
      const data = await brandService.getCreatorBrandProfile();
      if (!data) {
        router.replace('/(tabs)/(creator)/register-company');
        return;
      }
      setBrand(data);
    } catch (error) {
      setBrand(null);
      setLoadError(error?.message || 'Failed to load creator profile');
    } finally {
      if (showInitialLoader) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {

      loadProfile(true);
    }, [loadProfile])
  );

  const profile = useMemo(() => {
    if (brand) {
      return {
        brandName: brand.brandName || 'Brand',
        statusText: brand.verified ? 'Your request has been approved' : 'Your request is being evaluated',
        statusColor: brand.verified ? '#0F9D58' : '#E10600',
        logo: brand.logo || DEFAULT_LOGO,
        companyAddress: brand.companyAddress || '-',
        wallet: brand.companyWalletAddress || '-',
        personName: brand.personInChargeName || brand.ownerName || '-',
        personEmail: brand.personInChargeEmail || brand.companyEmail || '-',
        personRole: brand.personInChargeRole || '-',
        personPhone: brand.personInChargePhone || '-',
        requestLetterUrl: brand.statementLetterUrl || '',
      };
    }

    return {
      brandName: 'ZEAL',
      statusText: 'Your request is being evaluated',
      statusColor: '#E10600',
      logo: DEFAULT_LOGO,
      companyAddress: '-',
      wallet: '-',
      personName: '-',
      personEmail: '-',
      personRole: '-',
      personPhone: '-',
      requestLetterUrl: '',
    };
  }, [brand]);

  const openRequestLetter = async () => {
    if (!profile.requestLetterUrl) {
      Alert.alert('Unavailable', 'No request letter found for this brand.');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(profile.requestLetterUrl);
      if (!canOpen) {
        Alert.alert('Unavailable', 'Cannot open request letter URL.');
        return;
      }

      await Linking.openURL(profile.requestLetterUrl);
    } catch (_error) {
      Alert.alert('Unavailable', 'Cannot open request letter URL.');
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadProfile(false);
  };

  const handleNavigation = (path) => {
    router.push({
      pathname: path,
      params: {
        returnTo: '/(tabs)/(creator)/(tabs)/creatorProfile',
      },
    });
  };

  const handleDeleteBrand = () => {
    Alert.alert(
      'Delete Brand',
      'Are you sure you want to delete this brand? This action is not available yet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Unavailable', 'Delete Brand flow is not connected yet.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#111" />
        }
      >
       

        <Text style={styles.header}>Account</Text>

        <View style={styles.statusBadge}>
          <Ionicons name="information-circle" size={20} color={profile.statusColor} />
          <Text style={[styles.statusText, { color: profile.statusColor }]}>{profile.statusText}</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {!!profile.logo ? (
              <Image source={{ uri: profile.logo }} style={styles.avatar} />
            ) : (
              <Ionicons name="business" size={26} color="#fff" />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile.brandName}</Text>
            <Text style={styles.handle}>{toBrandHandle(profile.brandName)}</Text>
          </View>
        </View>

        {!isLoading && !!loadError && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadProfile()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Company Address</Text>
          <Text style={styles.sectionBody}>{profile.companyAddress}</Text>
        </View>

        <View style={styles.walletCard}>
          <Text style={styles.walletTitle}>Company Crypto Wallet</Text>
          <View style={styles.walletBox}>
            <View style={styles.walletLeft}>
              <Image
                source={{ uri: 'https://seeklogo.com/images/M/metamask-logo-09EDE53DBD-seeklogo.com.png' }}
                style={styles.walletIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.walletName}>Metamask</Text>
                <Text style={styles.walletAddress}>{truncateWallet(profile.wallet)}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.manageButton}>
              <Text style={styles.manageText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Person In Charge Detail</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValue}>{profile.personName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{profile.personEmail}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Role</Text>
            <Text style={styles.detailValue}>{profile.personRole}</Text>
          </View>
          <View style={styles.detailRowLast}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            <Text style={styles.detailValue}>{profile.personPhone}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.menuButton} onPress={openRequestLetter}>
          <View style={styles.menuLeft}>
            <Ionicons name="document-attach-outline" size={20} color="#111" />
            <View style={styles.menuLabelWrap}>
              <Text style={styles.menuText}>Request Letter</Text>
              <Text style={styles.menuSubText} numberOfLines={1}>
                {getFileName(profile.requestLetterUrl)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuOptionButton}
          onPress={() => handleNavigation('/(settings)/faquser')}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="help-circle-outline" size={20} color="#111" />
            <Text style={styles.menuOptionText}>FAQ</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuOptionButton}
          onPress={() => handleNavigation('/(settings)/useterms')}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="document-text-outline" size={20} color="#111" />
            <Text style={styles.menuOptionText}>Terms Of Use</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuOptionButton}
          onPress={() => handleNavigation('/(settings)/privacypolicy')}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#111" />
            <Text style={styles.menuOptionText}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBrandButton} onPress={handleDeleteBrand}>
          <Text style={styles.deleteBrandButtonText}>Delete Brand</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <LoadingPulse label="Loading creator profile..." />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flex: 1,
    marginTop: 10,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  zealLogo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.4,
  },
  modePill: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  modeSideInactive: {
    width: 52,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modeSideActive: {
    width: 56,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  handle: {
    color: '#ccc',
    fontSize: 14,
  },
  errorWrap: {
    borderWidth: 1,
    borderColor: '#f0caca',
    borderRadius: 12,
    backgroundColor: '#fff4f4',
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  walletCard: {
    marginBottom: 12,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  walletBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletIcon: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  walletName: {
    fontWeight: '600',
    fontSize: 16,
  },
  walletAddress: {
    color: '#666',
    fontSize: 13,
  },
  manageButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manageText: {
    color: '#fff',
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  detailRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  detailLabel: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
    marginRight: 12,
  },
  detailValue: {
    color: '#111',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  menuButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuLabelWrap: {
    marginLeft: 10,
    flex: 1,
  },
  menuText: {
    fontWeight: '600',
    color: '#111',
    fontSize: 14,
  },
  menuSubText: {
    color: '#777',
    fontSize: 12,
    marginTop: 2,
  },
  menuOptionButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  menuOptionText: {
    fontWeight: '600',
    color: '#111',
    fontSize: 16,
    marginLeft: 10,
  },
  deleteBrandButton: {
    backgroundColor: '#d10000',
    borderRadius: 12,
    padding: 18,
    marginTop: 10,
    alignItems: 'center',
  },
  deleteBrandButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  bottomSpacer: {
    height: 8,
  },
});
