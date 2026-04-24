import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet } from '@/components/context/WalletContext';
import { useRole } from '@/components/context/RoleContext';
import { walletService } from '@/services/walletService';

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

export default function WalletSettingsScreen() {
  const router = useRouter();
  const { setCurrentUser } = useRole();
  const {
    wallet,
    error,
    isConnecting,
    connectWallet,
    reconnectWallet,
    disconnectWallet,
    getChainId,
    signMessage,
  } = useWallet();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chainLabel, setChainLabel] = useState('Unknown');

  const walletAddress = useMemo(() => formatWalletAddress(wallet?.address), [wallet?.address]);

  const resolveChainLabel = useCallback(async () => {
    try {
      const chainId = await getChainId();
      if (!chainId) {
        setChainLabel('Unknown');
        return;
      }

      const normalizedChain = String(chainId).toLowerCase();
      if (normalizedChain === '0x89') {
        setChainLabel('Polygon Mainnet (0x89)');
        return;
      }

      if (normalizedChain === '0x13881') {
        setChainLabel('Mumbai Testnet (0x13881)');
        return;
      }

      setChainLabel(`${normalizedChain}`);
    } catch {
      setChainLabel('Unknown');
    }
  }, [getChainId]);

  const linkWalletToProfile = useCallback(
    async (walletAddress) => {
      const safeWalletAddress = String(walletAddress || '').trim();
      if (!safeWalletAddress) {
        throw new Error('Wallet address is unavailable. Please reconnect and try again.');
      }

      const nonceData = await walletService.getWalletNonce(safeWalletAddress);
      const message = nonceData?.message;
      if (!message) {
        throw new Error('Failed to prepare wallet signature challenge. Please try again.');
      }

      const signature = await signMessage(message, safeWalletAddress);
      if (!signature) {
        throw new Error('Wallet signature was cancelled.');
      }

      const updatedUser = await walletService.connectWalletToCurrentUser(
        safeWalletAddress,
        signature,
        message
      );
      await setCurrentUser(updatedUser);
    },
    [setCurrentUser, signMessage]
  );

  const runAction = async (action) => {
    try {
      setIsSubmitting(true);
      await action();
      await resolveChainLabel();
    } catch (err) {
      Alert.alert('Wallet action failed', err?.message || 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnect = () =>
    runAction(async () => {
      const activeWallet = wallet?.address ? await reconnectWallet() : await connectWallet();
      const resolvedWalletAddress = String(activeWallet?.address || wallet?.address || '').trim();

      if (!resolvedWalletAddress) {
        throw new Error('Wallet connected but no address was returned. Please try again.');
      }

      await linkWalletToProfile(resolvedWalletAddress);
      Alert.alert('Wallet Linked', 'Your wallet has been connected and saved to your account profile.');
    });

  const handleDisconnect = () =>
    runAction(async () => {
      let backendDisconnectError = null;
      try {
        const updatedUser = await walletService.disconnectWalletFromCurrentUser();
        await setCurrentUser(updatedUser);
      } catch (err) {
        backendDisconnectError = err;
      }

      await disconnectWallet();

      if (backendDisconnectError) {
        throw new Error(
          `Wallet session disconnected, but profile wallet unlink failed: ${backendDisconnectError?.message || 'unknown error'}`
        );
      }

      Alert.alert('Wallet Disconnected', 'Your wallet has been removed from your profile and disconnected.');
    });

  const handleBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
    router.push('/(tabs)/(collector)/profile');
  };

  React.useEffect(() => {
    resolveChainLabel();
  }, [resolveChainLabel]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButtonContainer} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#111" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Wallet Settings</Text>
        <Text style={styles.subtitle}>Manage your active wallet connection</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Connected Wallet</Text>
          <Text style={styles.infoValue}>{walletAddress}</Text>

          <Text style={styles.infoLabel}>Network</Text>
          <Text style={styles.infoValue}>{chainLabel}</Text>

          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (isConnecting || isSubmitting) && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={isConnecting || isSubmitting}
        >
          {isConnecting || isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {wallet?.address ? 'Reconnect Wallet' : 'Connect Wallet'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleDisconnect}
          disabled={isSubmitting}
        >
          <Text style={styles.secondaryButtonText}>Disconnect Wallet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 17,
    color: '#111',
    fontWeight: '600',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    marginTop: 6,
    color: '#666',
    fontSize: 14,
  },
  infoCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  infoLabel: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 10,
    color: '#b91c1c',
    fontSize: 13,
  },
  primaryButton: {
    marginTop: 22,
    backgroundColor: '#111',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
