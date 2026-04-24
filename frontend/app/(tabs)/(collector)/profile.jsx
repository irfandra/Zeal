import React, { useCallback, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useRole } from '@/components/context/RoleContext';
import { useWallet } from '@/components/context/WalletContext';
import { authService } from '@/services/walletService';

const formatWalletAddress = (value) => {
  const wallet = String(value || '').trim();
  if (!wallet) {
    return '-';
  }

  if (wallet.length <= 14) {
    return wallet;
  }

  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
};

const getEmailHandle = (email) => {
  const safeEmail = String(email || '').trim().toLowerCase();
  if (!safeEmail.includes('@')) {
    return '@collector';
  }

  const localPart = safeEmail.split('@')[0].replace(/[^a-z0-9._-]/g, '');
  if (!localPart) {
    return '@collector';
  }

  return `@${localPart}`;
};

const getProfileName = (currentUser) => {
  const fullName = [currentUser?.firstName, currentUser?.lastName]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');

  if (fullName) {
    return fullName;
  }

  const email = String(currentUser?.email || '').trim();
  if (email.includes('@')) {
    return email.split('@')[0];
  }

  return 'Collector Account';
};

export default function AccountScreen() {
  const router = useRouter();
  const { currentUser, setCurrentUser, clearSession } = useRole();
  const { wallet, disconnectWallet } = useWallet();
  const [isLoadingProfile, setIsLoadingProfile] = useState(!currentUser);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileError, setProfileError] = useState('');

  const hasProfile = Boolean(currentUser);

  const loadCurrentProfile = useCallback(
    async (showInitialLoader = true) => {
      try {
        if (showInitialLoader) {
          setIsLoadingProfile(true);
        }

        setProfileError('');

        const profile = await authService.getCurrentUserProfile();
        await setCurrentUser(profile);
      } catch (error) {
        setProfileError(error?.message || 'Failed to load current profile');
      } finally {
        if (showInitialLoader) {
          setIsLoadingProfile(false);
        }
        setIsRefreshing(false);
      }
    },
    [setCurrentUser]
  );

  useFocusEffect(
    useCallback(() => {
      loadCurrentProfile(!hasProfile);
    }, [loadCurrentProfile, hasProfile])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadCurrentProfile(false);
  }, [loadCurrentProfile]);

  const profileName = useMemo(() => getProfileName(currentUser), [currentUser]);

  const profileHandle = useMemo(
    () => getEmailHandle(currentUser?.email),
    [currentUser?.email]
  );

  const avatarLabel = useMemo(() => {
    const words = profileName
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean);

    if (words.length === 0) {
      return 'U';
    }

    if (words.length === 1) {
      return words[0].slice(0, 1).toUpperCase();
    }

    return `${words[0].slice(0, 1)}${words[1].slice(0, 1)}`.toUpperCase();
  }, [profileName]);

  const walletAddress = useMemo(
    () => formatWalletAddress(currentUser?.walletAddress),
    [currentUser?.walletAddress]
  );

  const connectedWalletAddress = useMemo(
    () => formatWalletAddress(wallet?.address),
    [wallet?.address]
  );

  const showConnectedWalletHint = useMemo(() => {
    const hasLinkedWallet = Boolean(String(currentUser?.walletAddress || '').trim());
    const hasConnectedSessionWallet = Boolean(String(wallet?.address || '').trim());
    return !hasLinkedWallet && hasConnectedSessionWallet;
  }, [currentUser?.walletAddress, wallet?.address]);

  const accountEmail = useMemo(
    () => String(currentUser?.email || '-').trim() || '-',
    [currentUser?.email]
  );

  const handleSignOut = useCallback(async () => {
    await disconnectWallet();
    await AsyncStorage.multiRemove([
      'accessToken',
      'refreshToken',
      'availableWallets',
      'walletAddress',
    ]);
    await clearSession();
    router.replace('/(auth)/login');
  }, [clearSession, disconnectWallet, router]);

  const handleNavigation = (path) => {
    router.push(path);
  };

  if (isLoadingProfile && !hasProfile) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#111"
          />
        }
      >
        {}
        <Text style={styles.header}>Account</Text>

        {!!profileError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{profileError}</Text>
          </View>
        )}

        {}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarLabel}>{avatarLabel}</Text>
          </View>
          <View style={styles.profileTextWrap}>
            <Text style={styles.name}>{profileName}</Text>
            <Text style={styles.handle}>{profileHandle}</Text>
            <Text style={styles.emailText}>{accountEmail}</Text>
          </View>
        </View>

        {}
        <View style={styles.walletCard}>
          <Text style={styles.walletTitle}>Your Wallet</Text>
          <View style={styles.walletBox}>
            <Image
              source={{
                uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/MetaMask_Fox.svg/3840px-MetaMask_Fox.svg.png',
              }}
              style={styles.walletIcon}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.walletName}>Metamask</Text>
              <Text style={styles.walletAddress}>{walletAddress}</Text>
              {showConnectedWalletHint && (
                <Text style={styles.walletHint}>Session wallet: {connectedWalletAddress} (not linked to profile)</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => router.push('/wallet/settings')}
            >
              <Text style={styles.manageText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleNavigation('/(auth)/changepassword?showBack=true')}
        >
          <Text style={styles.menuText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleNavigation('/(settings)/faquser')}
        >
          <Text style={styles.menuText}>FAQ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleNavigation('/(settings)/useterms')}
        >
          <Text style={styles.menuText}>Terms Of Use</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleNavigation('/(settings)/privacypolicy')}
        >
          <Text style={styles.menuText}>Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { flex: 1, marginTop: 10 },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { fontSize: 28, fontWeight: '600', marginBottom: 20 },
  errorBox: {
    backgroundColor: '#fff4f4',
    borderColor: '#f0caca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
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
    height: 60,
    width: 60,
    borderRadius: 30,
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
  },
  avatarLabel: { color: '#fff', fontSize: 22, fontWeight: '700' },
  profileTextWrap: { flex: 1 },
  name: { color: '#fff', fontSize: 20, fontWeight: '700' },
  handle: { color: '#ccc', fontSize: 14 },
  emailText: { color: '#bfbfbf', fontSize: 12, marginTop: 4 },
  walletCard: { marginBottom: 20 },
  walletTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  walletBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  walletIcon: { height: 32, width: 32, marginRight: 10 },
  walletName: { fontWeight: '600', fontSize: 16 },
  walletAddress: { color: '#666', fontSize: 13 },
  walletHint: { color: '#9a3412', fontSize: 11, marginTop: 4 },
  manageButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manageText: { color: '#fff', fontWeight: '600' },
  menuButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  menuText: { fontWeight: '600' },
  signOutButton: {
    backgroundColor: 'red',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  signOutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bottomSpacer: { height: 40 },
});