import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import '@walletconnect/react-native-compat';
import { Alert, AppState, Linking, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLinking from 'expo-linking';
import Constants from 'expo-constants';
import { WalletConnectModal, useWalletConnectModal } from '@walletconnect/modal-react-native';

const PROJECT_ID = String(process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID || '').trim();
const RELAY_URL = process.env.EXPO_PUBLIC_WALLETCONNECT_RELAY_URL || 'wss://relay.walletconnect.com';
const WALLETCONNECT_DEEPLINK_CHOICE_KEY = 'WALLETCONNECT_DEEPLINK_CHOICE';
const WALLETCONNECT_FORCE_NEW_SESSION_KEY = 'WALLETCONNECT_FORCE_NEW_SESSION';

const HARDHAT_LOCAL_RPC_URL =
  process.env.EXPO_PUBLIC_POLYGON_LIKE_RPC_URL
  || process.env.EXPO_PUBLIC_HARDHAT_RPC_URL
  || 'https://rpc-amoy.polygon.technology';
const HARDHAT_CHAIN_ID_DEC = (() => {
  const parsed = Number.parseInt(
    String(
      process.env.EXPO_PUBLIC_POLYGON_LIKE_CHAIN_ID
      || process.env.EXPO_PUBLIC_HARDHAT_CHAIN_ID
      || ''
    ).trim(),
    10
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 80002;
})();
const HARDHAT_CHAIN_ID_HEX = `0x${BigInt(HARDHAT_CHAIN_ID_DEC).toString(16)}`;
const AUTH_DEFAULT_CHAIN_NAMESPACE = 'eip155:1';

const WalletContext = createContext();



if (typeof BackHandler.removeEventListener !== 'function') {
  BackHandler.removeEventListener = () => {};
}

const isHttpsUrl = (value) => /^https:\/\//i.test(String(value || '').trim());

const isWalletConnectChainApprovalError = (error) => {
  const lower = String(error?.message || '').toLowerCase();
  return (
    lower.includes('chain is not approved') ||
    lower.includes('wallet_switchethereumchain') ||
    lower.includes('does not support') ||
    lower.includes('method not found')
  );
};

const isWalletConnectStalePairingError = (error) => {
  const lower = String(error?.message || '').toLowerCase();
  return lower.includes('no matching key') && lower.includes('pairing');
};

const isWalletConnectNamespaceConversionCrash = (error) => {
  const lower = String(error?.message || '').toLowerCase();
  if (!lower.includes('cannot convert undefined value to object')) {
    return false;
  }

  return (
    lower.includes('namespace') ||
    lower.includes('namespaces') ||
    lower.includes('object.keys') ||
    lower.includes('required') ||
    lower.includes('received') ||
    lower.includes('proposal')
  );
};

const normalizeChainIdHex = (value) => {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  try {
    if (raw.toLowerCase().startsWith('0x')) {
      return `0x${BigInt(raw).toString(16)}`;
    }

    if (!/^\d+$/.test(raw)) {
      return '';
    }

    return `0x${BigInt(raw).toString(16)}`;
  } catch {
    return '';
  }
};

const CHAIN_CONFIGS = {
  [HARDHAT_CHAIN_ID_HEX]: {
    chainName: 'Polygon Hardhat Local',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: [HARDHAT_LOCAL_RPC_URL],
    blockExplorerUrls: [],
  },
};

const SUPPORTED_POLYGON_CHAIN_IDS = new Set(Object.keys(CHAIN_CONFIGS));
const DEFAULT_PREFERRED_CHAIN_ID = HARDHAT_CHAIN_ID_HEX;

const EIP155_REQUIRED_METHODS = [

  'eth_sendTransaction',
  'personal_sign',
];

const EIP155_OPTIONAL_METHODS = [
  'eth_accounts',
  'eth_requestAccounts',
  'eth_chainId',
  'wallet_watchAsset',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
];

const EIP155_EVENTS = ['chainChanged', 'accountsChanged'];

const AUTH_REQUIRED_CHAINS = [AUTH_DEFAULT_CHAIN_NAMESPACE];
const OPTIONAL_CHAIN_SCOPES = Array.from(
  new Set([
    AUTH_DEFAULT_CHAIN_NAMESPACE,
    `eip155:${HARDHAT_CHAIN_ID_DEC}`,
  ])
);

const WALLETCONNECT_SESSION_PARAMS = {
  namespaces: {
    eip155: {
      methods: EIP155_REQUIRED_METHODS,
      chains: AUTH_REQUIRED_CHAINS,
      events: EIP155_EVENTS,
      rpcMap: {},
    },
  },
  optionalNamespaces: {
    eip155: {
      methods: Array.from(new Set([...EIP155_REQUIRED_METHODS, ...EIP155_OPTIONAL_METHODS])),
      chains: OPTIONAL_CHAIN_SCOPES,
      events: EIP155_EVENTS,
      rpcMap: {},
    },
  },
};

const getNamespaceChainsFromSessionNamespace = (namespaceValue) => {
  if (!namespaceValue || typeof namespaceValue !== 'object') {
    return [];
  }

  const explicitChains = Array.isArray(namespaceValue.chains) ? namespaceValue.chains : [];
  if (explicitChains.length > 0) {
    return explicitChains
      .filter((entry) => typeof entry === 'string' && entry.includes(':'));
  }

  const accounts = Array.isArray(namespaceValue.accounts) ? namespaceValue.accounts : [];
  const derivedChains = accounts
    .map((entry) => {
      if (typeof entry !== 'string') return '';
      const parts = entry.split(':');
      if (parts.length < 2) return '';
      return `${parts[0]}:${parts[1]}`;
    })
    .filter((entry) => Boolean(entry));

  return Array.from(new Set(derivedChains));
};

const deriveRequiredNamespacesFromSessionNamespaces = (sessionNamespaces) => {
  if (!sessionNamespaces || typeof sessionNamespaces !== 'object') {
    return null;
  }

  const requiredNamespaces = {};

  Object.entries(sessionNamespaces).forEach(([namespaceKey, namespaceValue]) => {
    if (!namespaceValue || typeof namespaceValue !== 'object') {
      return;
    }

    const methods = Array.isArray(namespaceValue.methods) ? namespaceValue.methods : [];
    const events = Array.isArray(namespaceValue.events) ? namespaceValue.events : [];
    const chains = getNamespaceChainsFromSessionNamespace(namespaceValue);

    if (methods.length === 0 || events.length === 0 || chains.length === 0) {
      return;
    }

    requiredNamespaces[namespaceKey] = {
      methods,
      events,
      chains,
    };
  });

  return Object.keys(requiredNamespaces).length > 0 ? requiredNamespaces : null;
};

const hasWalletConnectRequiredNamespaces = (provider) => {
  const requiredNamespaces = provider?.session?.requiredNamespaces;
  if (!requiredNamespaces || typeof requiredNamespaces !== 'object') {
    return false;
  }

  const namespaces = Object.values(requiredNamespaces);
  if (!Array.isArray(namespaces) || namespaces.length === 0) {
    return false;
  }

  return namespaces.every((namespaceValue) => {
    if (!namespaceValue || typeof namespaceValue !== 'object') {
      return false;
    }

    const methods = Array.isArray(namespaceValue.methods) ? namespaceValue.methods : [];
    const events = Array.isArray(namespaceValue.events) ? namespaceValue.events : [];
    const chains = Array.isArray(namespaceValue.chains) ? namespaceValue.chains : [];

    return methods.length > 0 && events.length > 0 && chains.length > 0;
  });
};

const hasRequiredWalletConnectSession = (provider) => {

  if (!provider || typeof provider.request !== 'function') {
    return false;
  }

  const namespace = provider?.session?.namespaces?.eip155;
  if (!namespace || typeof namespace !== 'object') {
    return false;
  }

  const methods = Array.isArray(namespace.methods) ? namespace.methods : [];
  const hasSigningMethod = methods.includes('personal_sign');
  const hasRequiredNamespaces = hasWalletConnectRequiredNamespaces(provider);


  return hasSigningMethod && hasRequiredNamespaces;
};

const hasEip155SessionNamespace = (provider) => {
  const namespace = provider?.session?.namespaces?.eip155;
  return Boolean(namespace && typeof namespace === 'object');
};

const hasWalletConnectChainScope = (provider, chainScope) => {
  const namespace = provider?.session?.namespaces?.eip155;
  if (!namespace || typeof namespace !== 'object') {
    return false;
  }

  const safeScope = String(chainScope || '').trim();
  if (!safeScope) {
    return false;
  }

  const chains = Array.isArray(namespace.chains) ? namespace.chains : [];
  const accounts = Array.isArray(namespace.accounts) ? namespace.accounts : [];

  if (chains.includes(safeScope)) {
    return true;
  }

  return accounts.some((entry) => typeof entry === 'string' && entry.startsWith(`${safeScope}:`));
};

const hasLegacyUnsupportedHardhatScope = (provider) => {
  if (HARDHAT_CHAIN_ID_DEC === 31337) {
    return false;
  }

  return hasWalletConnectChainScope(provider, 'eip155:31337');
};

const getEip155SessionAddresses = (provider) => {
  const accounts = provider?.session?.namespaces?.eip155?.accounts;
  if (!Array.isArray(accounts)) {
    return [];
  }

  return accounts
    .map((entry) => {
      if (typeof entry !== 'string') return '';
      const parts = entry.split(':');
      return parts[parts.length - 1] || '';
    })
    .filter((entry) => typeof entry === 'string' && entry.startsWith('0x'));
};

const isWalletCallbackUrl = (url) => {
  const lowerUrl = String(url || '').toLowerCase();
  if (!lowerUrl) {
    return false;
  }

  return (
    lowerUrl.startsWith('zeal://') ||
    lowerUrl.startsWith('exp://') ||
    lowerUrl.startsWith('exps://') ||
    lowerUrl.includes('://wc') ||
    lowerUrl.includes('/wc') ||
    lowerUrl.includes('walletconnect') ||
    lowerUrl.includes('metamask')
  );
};

const isHexWalletAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());

const normalizePolAmount = (value) => {
  const raw = String(value ?? '').trim().replace(/,/g, '');
  if (!raw) {
    throw new Error('Payment amount is missing.');
  }

  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error('Payment amount is invalid.');
  }

  return raw;
};

const toWeiHex = (polAmount) => {
  const [wholePart, decimalPart = ''] = String(polAmount).split('.');
  const wholeWei = BigInt(wholePart || '0') * 10n ** 18n;
  const decimalSlice = decimalPart.slice(0, 18).padEnd(18, '0');
  const decimalWei = BigInt(decimalSlice || '0');
  const wei = wholeWei + decimalWei;

  if (wei <= 0n) {
    throw new Error('Payment amount must be greater than zero.');
  }

  return `0x${wei.toString(16)}`;
};

const parseRpcBigInt = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  try {
    if (raw.toLowerCase().startsWith('0x')) {
      return BigInt(raw);
    }

    if (/^\d+$/.test(raw)) {
      return BigInt(raw);
    }
  } catch {
    return null;
  }

  return null;
};

const toHexWei = (value) => `0x${value.toString(16)}`;

const normalizeHexDataPayload = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    throw new Error('Contract calldata is required.');
  }

  const hexValue = raw.toLowerCase().startsWith('0x') ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]+$/.test(hexValue) || hexValue.length < 10) {
    throw new Error('Contract calldata is invalid.');
  }

  return hexValue;
};

const normalizeWeiHexValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return '0x0';
  }

  const parsedValue = parseRpcBigInt(value);
  if (parsedValue === null || parsedValue < 0n) {
    throw new Error('Transaction value is invalid.');
  }

  return toHexWei(parsedValue);
};

const ONE_GWEI_WEI = 1_000_000_000n;
const DEFAULT_PRIORITY_FEE_WEI = 2_000_000_000n;

const WalletProviderInner = ({ children }) => {
  const { open, disconnect, isConnected, address, provider } = useWalletConnectModal();
  const [wallet, setWallet] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const walletRef = useRef(wallet);
  const connectionStateRef = useRef({ isConnected: false, address: null });
  const providerRef = useRef(provider);
  const connectInFlightRef = useRef(false);
  const didWarnExpoGoRef = useRef(false);
  const hasHandledInitialWalletUrlRef = useRef(false);
  const repairingInvalidSessionRef = useRef(false);

  useEffect(() => {
    walletRef.current = wallet;
  }, [wallet]);

  useEffect(() => {
    providerRef.current = provider;
  }, [provider]);

  const safeDisconnect = useCallback(async () => {
    if (typeof disconnect === 'function') {
      await disconnect();
      return;
    }

    const activeProvider = providerRef.current;
    if (activeProvider && typeof activeProvider.disconnect === 'function') {
      await activeProvider.disconnect();
    }
  }, [disconnect]);

  const clearWalletConnectCoreStorage = useCallback(async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      if (!Array.isArray(allKeys) || allKeys.length === 0) {
        return 0;
      }

      const walletConnectKeys = allKeys.filter((key) => {
        const lowerKey = String(key || '').toLowerCase();
        return lowerKey.startsWith('wc@') || lowerKey.includes('walletconnect');
      });

      if (walletConnectKeys.length > 0) {
        await AsyncStorage.multiRemove(walletConnectKeys);
      }

      return walletConnectKeys.length;
    } catch (err) {
      console.warn('Unable to clear WalletConnect core storage keys:', err?.message || err);
      return 0;
    }
  }, []);

  const repairSessionRequiredNamespaces = useCallback(async (activeProvider, source = 'unknown') => {
    const activeSession = activeProvider?.session;
    if (!activeSession || typeof activeSession !== 'object') {
      return { repaired: false, valid: true };
    }

    if (hasWalletConnectRequiredNamespaces(activeProvider)) {
      return { repaired: false, valid: true };
    }

    const derivedRequiredNamespaces = deriveRequiredNamespacesFromSessionNamespaces(activeSession.namespaces);
    if (!derivedRequiredNamespaces) {
      console.warn(`[WalletConnect] Session is missing requiredNamespaces and cannot be repaired (${source}).`);
      return { repaired: false, valid: false };
    }

    try {
      activeSession.requiredNamespaces = derivedRequiredNamespaces;

      const sessionTopic = String(activeSession.topic || '').trim();
      if (
        sessionTopic &&
        activeProvider?.client?.session &&
        typeof activeProvider.client.session.update === 'function'
      ) {
        await activeProvider.client.session.update(sessionTopic, {
          requiredNamespaces: derivedRequiredNamespaces,
        });
      }

      console.warn(`[WalletConnect] Repaired missing requiredNamespaces from active session (${source}).`);
      return { repaired: true, valid: true };
    } catch (err) {
      console.warn('[WalletConnect] Failed to repair missing requiredNamespaces:', err?.message || err);
      return { repaired: false, valid: false };
    }
  }, []);

  const normalizeAddress = useCallback((value) => {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
  }, []);

  const mergeUniqueAddresses = useCallback((values) => {
    const seen = new Set();
    const uniqueAddresses = [];

    values.forEach((value) => {
      if (typeof value !== 'string') return;
      const trimmed = value.trim();
      if (!trimmed.startsWith('0x')) return;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      uniqueAddresses.push(trimmed);
    });

    return uniqueAddresses;
  }, []);

  const refreshWalletAccounts = useCallback(async (preferredAddress = null, options = {}) => {
    const { allowDisconnected = false } = options;
    const currentWalletAddress = String(walletRef.current?.address || '').trim();

    const activeProvider = providerRef.current || provider;
    const hasSessionNamespace = hasEip155SessionNamespace(activeProvider);

    if (!activeProvider) {
      setAccounts([]);
      return [];
    }

    if (!hasSessionNamespace) {
      setAccounts([]);
      return [];
    }

    if (!isConnected && !allowDisconnected) {
      setAccounts([]);
      return [];
    }

    let providerAccounts = getEip155SessionAddresses(activeProvider);
    try {
      if (providerAccounts.length === 0) {
        const response = await activeProvider.request({ method: 'eth_accounts' });
        if (Array.isArray(response)) {
          providerAccounts = response;
        }
      }
    } catch (err) {
      console.warn('Failed to read wallet accounts from provider:', err?.message || err);
    }

    const availableAccounts = mergeUniqueAddresses([
      ...(Array.isArray(providerAccounts) ? providerAccounts : []),
      preferredAddress || '',
      currentWalletAddress,
    ]);

    setAccounts(availableAccounts);

    if (availableAccounts.length === 0) {
      return [];
    }

    const targetAddress =
      availableAccounts.find((entry) => normalizeAddress(entry) === normalizeAddress(preferredAddress)) ||
      availableAccounts.find((entry) => normalizeAddress(entry) === normalizeAddress(currentWalletAddress)) ||
      availableAccounts[0];

    if (targetAddress && normalizeAddress(targetAddress) !== normalizeAddress(currentWalletAddress)) {
      const walletData = { address: targetAddress, isConnected: true };
      setWallet(walletData);
      await AsyncStorage.setItem('walletAddress', targetAddress);
    }

    return availableAccounts;
  }, [provider, isConnected, mergeUniqueAddresses, normalizeAddress]);

  const hydrateWalletFromProvider = useCallback(async (source = 'unknown') => {
    const activeProvider = providerRef.current || provider;
    if (!activeProvider || typeof activeProvider.request !== 'function') {
      return;
    }

    const currentWallet = walletRef.current;
    const preferredAddress = String(connectionStateRef.current?.address || currentWallet?.address || '').trim() || null;

    try {
      const availableAccounts = await refreshWalletAccounts(preferredAddress, { allowDisconnected: true });
      if (!Array.isArray(availableAccounts) || availableAccounts.length === 0) {
        return;
      }

      const normalizedPreferred = normalizeAddress(preferredAddress || '');
      const candidateAddress =
        availableAccounts.find((entry) => normalizeAddress(entry) === normalizedPreferred) ||
        availableAccounts[0];

      if (!candidateAddress) {
        return;
      }

      const normalizedCandidate = normalizeAddress(candidateAddress);
      const normalizedCurrent = normalizeAddress(currentWallet?.address || '');
      if (normalizedCandidate === normalizedCurrent && currentWallet?.isConnected) {
        connectionStateRef.current = { isConnected: true, address: candidateAddress };
        return;
      }

      const walletData = { address: candidateAddress, isConnected: true };
      setWallet(walletData);
      await AsyncStorage.setItem('walletAddress', candidateAddress);
      connectionStateRef.current = { isConnected: true, address: candidateAddress };
    } catch (err) {
      console.warn(`[WalletConnect] Unable to hydrate wallet after ${source}:`, err?.message || err);
    }
  }, [provider, refreshWalletAccounts, normalizeAddress]);

  useEffect(() => {
    connectionStateRef.current = { isConnected, address };
  }, [isConnected, address]);

  useEffect(() => {
    if (isConnected && address) {
      refreshWalletAccounts(address).catch((err) => {
        console.warn('Unable to set wallet from provider accounts:', err?.message || err);
      });
      return;
    }

    const activeProvider = providerRef.current || provider;
    const hasSessionAccounts = getEip155SessionAddresses(activeProvider).length > 0;

    if (hasSessionAccounts) {
      return;
    }

    setWallet((prev) => (prev === null ? prev : null));
    setAccounts((prev) => (Array.isArray(prev) && prev.length === 0 ? prev : []));
    AsyncStorage.removeItem('walletAddress').catch((err) => {
      console.error('Error clearing wallet address:', err);
    });
  }, [isConnected, address, provider, refreshWalletAccounts]);

  useEffect(() => {
    if (!isConnected) return;
    refreshWalletAccounts(address).catch((err) => {
      console.warn('Unable to refresh wallet accounts:', err?.message || err);
    });
  }, [isConnected, address, provider, refreshWalletAccounts]);

  useEffect(() => {
    if (!provider || typeof provider.request !== 'function') {
      return undefined;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        hydrateWalletFromProvider('app foreground return');
      }
    });

    return () => subscription.remove();
  }, [provider, hydrateWalletFromProvider]);

  useEffect(() => {
    const handleIncomingUrl = ({ url }) => {
      if (!isWalletCallbackUrl(url)) {
        return;
      }

      setTimeout(() => {
        hydrateWalletFromProvider('deep-link callback');
      }, 200);
    };

    const subscription = Linking.addEventListener('url', handleIncomingUrl);

    Linking.getInitialURL()
      .then((initialUrl) => {
        if (hasHandledInitialWalletUrlRef.current) {
          return;
        }

        if (!isWalletCallbackUrl(initialUrl)) {
          return;
        }

        hasHandledInitialWalletUrlRef.current = true;

        setTimeout(() => {
          hydrateWalletFromProvider('initial callback url');
        }, 200);
      })
      .catch(() => null);

    return () => subscription.remove();
  }, [hydrateWalletFromProvider]);

  useEffect(() => {
    const activeProvider = providerRef.current || provider;
    if (!activeProvider?.session?.topic || repairingInvalidSessionRef.current) {
      return undefined;
    }

    if (hasWalletConnectRequiredNamespaces(activeProvider)) {
      return undefined;
    }

    repairingInvalidSessionRef.current = true;
    let isCancelled = false;

    const repairOrResetInvalidSession = async () => {
      const repairResult = await repairSessionRequiredNamespaces(activeProvider, 'provider bootstrap');
      if (repairResult.valid || isCancelled) {
        return;
      }

      console.warn('[WalletConnect] Resetting invalid wallet session before reuse.');
      await AsyncStorage.setItem(WALLETCONNECT_FORCE_NEW_SESSION_KEY, '1').catch(() => null);

      try {
        await safeDisconnect();
      } catch (err) {
        console.warn('Failed to disconnect invalid wallet session during bootstrap:', err?.message || err);
      }

      if (isCancelled) {
        return;
      }

      setWallet(null);
      setAccounts([]);
      connectionStateRef.current = { isConnected: false, address: null };

      await AsyncStorage.multiRemove(['walletAddress', WALLETCONNECT_DEEPLINK_CHOICE_KEY]).catch(() => null);
      await clearWalletConnectCoreStorage();
    };

    repairOrResetInvalidSession()
      .catch((err) => {
        console.warn('Unable to repair/reset invalid wallet session:', err?.message || err);
      })
      .finally(() => {
        repairingInvalidSessionRef.current = false;
      });

    return () => {
      isCancelled = true;
    };
  }, [provider, safeDisconnect, clearWalletConnectCoreStorage, repairSessionRequiredNamespaces]);


  useEffect(() => {
    const activeProvider = providerRef.current || provider;
    if (!activeProvider || typeof activeProvider.on !== 'function') {
      return undefined;
    }

    const handleConnect = () => {
      console.log('[WalletConnect] Connected event received');
      hydrateWalletFromProvider('connect event');
    };

    const handleAccountsChanged = (accounts) => {
      console.log('[WalletConnect] Accounts changed:', accounts);
      if (Array.isArray(accounts) && accounts.length > 0) {
        connectionStateRef.current = { isConnected: true, address: accounts[0] };
        hydrateWalletFromProvider('accountsChanged event');
      }
    };

    const handleChainChanged = (chainId) => {
      console.log('[WalletConnect] Chain changed:', chainId);
      hydrateWalletFromProvider('chainChanged event');
    };

    const handleDisconnect = () => {
      console.log('[WalletConnect] Disconnected');
      setWallet((prev) => (prev === null ? prev : null));
      setAccounts((prev) => (Array.isArray(prev) && prev.length === 0 ? prev : []));
      connectionStateRef.current = { isConnected: false, address: null };
    };

    activeProvider.on('connect', handleConnect);
    activeProvider.on('accountsChanged', handleAccountsChanged);
    activeProvider.on('chainChanged', handleChainChanged);
    activeProvider.on('session_delete', handleDisconnect);
    activeProvider.on('disconnect', handleDisconnect);

    return () => {
      if (typeof activeProvider.removeListener === 'function') {
        activeProvider.removeListener('connect', handleConnect);
        activeProvider.removeListener('accountsChanged', handleAccountsChanged);
        activeProvider.removeListener('chainChanged', handleChainChanged);
        activeProvider.removeListener('session_delete', handleDisconnect);
        activeProvider.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [provider, hydrateWalletFromProvider]);

  const connectWallet = useCallback(async () => {
    if (connectInFlightRef.current) {
      const currentAddress = String(connectionStateRef.current?.address || walletRef.current?.address || '').trim();
      if (currentAddress) {
        return { address: currentAddress, isConnected: true };
      }
      return null;
    }

    try {
      connectInFlightRef.current = true;
      setIsConnecting(true);
      setError(null);

      if (!PROJECT_ID) {
        throw new Error('WalletConnect is not configured. Set EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID in frontend/.env');
      }

      if (typeof open !== 'function') {
        throw new Error('Wallet connector is not ready yet. Please try again.');
      }

      const executionEnvironment = String(Constants.executionEnvironment || '').trim();
      const appOwnership = String(Constants.appOwnership || '').trim();
      const isExpoGoRuntime = executionEnvironment === 'storeClient' || appOwnership === 'expo';
      if (isExpoGoRuntime && !didWarnExpoGoRef.current) {
        didWarnExpoGoRef.current = true;
        Alert.alert(
          'Use Development Build',
          'MetaMask return deep-links are unreliable in Expo Go. Use npx expo run:android or npx expo run:ios for stable wallet login redirects.'
        );
      }

      const activeProviderAtStart = providerRef.current || provider;
      const sessionRepairState = await repairSessionRequiredNamespaces(activeProviderAtStart, 'connect preflight');
      const canReuseExistingSession = hasRequiredWalletConnectSession(activeProviderAtStart);
      const hasInvalidRequiredNamespaces =
        Boolean(activeProviderAtStart?.session) && !sessionRepairState.valid;
      const hasLegacyScope = hasLegacyUnsupportedHardhatScope(activeProviderAtStart);
      const runtimeCallbackUrl = ExpoLinking.createURL('wc');
      const configuredNativeRedirect = String(process.env.EXPO_PUBLIC_WALLETCONNECT_NATIVE_REDIRECT || '').trim();
      const expectedNativeRedirect = isExpoGoRuntime
        ? runtimeCallbackUrl
        : (configuredNativeRedirect || 'zeal://wc');

      const normalizeRedirectUrl = (value) =>
        String(value || '')
          .trim()
          .replace(/\/$/, '')
          .toLowerCase();

      const sessionNativeRedirect = String(
        activeProviderAtStart?.session?.peer?.metadata?.redirect?.native ||
        ''
      ).trim();

      const hasRedirectMismatch =
        Boolean(sessionNativeRedirect) &&
        Boolean(expectedNativeRedirect) &&
        normalizeRedirectUrl(sessionNativeRedirect) !== normalizeRedirectUrl(expectedNativeRedirect);

      if (hasLegacyScope) {
        console.warn('[WalletConnect] Legacy eip155:31337 scope detected. Forcing a fresh session proposal.');
      }

      if (hasRedirectMismatch) {
        console.warn(
          `[WalletConnect] Session redirect mismatch detected (session=${sessionNativeRedirect}, expected=${expectedNativeRedirect}). Forcing a fresh session.`
        );
      }

      if (hasInvalidRequiredNamespaces) {
        console.warn('[WalletConnect] Session is missing requiredNamespaces. Forcing a fresh session proposal.');
      }

      const shouldForceFreshSession =
        (await AsyncStorage.getItem(WALLETCONNECT_FORCE_NEW_SESSION_KEY).catch(() => null)) === '1' ||
        hasLegacyScope ||
        hasRedirectMismatch ||
        hasInvalidRequiredNamespaces;


      const currentConnection = connectionStateRef.current;
      const currentAddress = String(currentConnection?.address || '').trim();
      if (!shouldForceFreshSession && currentConnection?.isConnected && currentAddress && canReuseExistingSession) {
        const walletData = { address: currentAddress, isConnected: true };
        setWallet(walletData);
        await AsyncStorage.setItem('walletAddress', currentAddress);
        await refreshWalletAccounts(currentAddress);
        return walletData;
      }

      if (!shouldForceFreshSession && canReuseExistingSession) {
        const sessionAccounts = getEip155SessionAddresses(activeProviderAtStart);
        const firstSessionAccount = sessionAccounts.find((entry) => typeof entry === 'string' && entry.startsWith('0x'));
        if (firstSessionAccount) {
          const walletData = { address: firstSessionAccount, isConnected: true };
          setWallet(walletData);
          await AsyncStorage.setItem('walletAddress', firstSessionAccount);
          await refreshWalletAccounts(firstSessionAccount, { allowDisconnected: true });
          return walletData;
        }
      }

      if (!shouldForceFreshSession && canReuseExistingSession && activeProviderAtStart && typeof activeProviderAtStart.request === 'function') {
        try {
          const existingAccounts = await activeProviderAtStart.request({ method: 'eth_accounts' });
          if (canReuseExistingSession && Array.isArray(existingAccounts)) {
            const firstAccount = existingAccounts.find((entry) => typeof entry === 'string' && entry.startsWith('0x'));
            if (firstAccount) {
              const walletData = { address: firstAccount, isConnected: true };
              setWallet(walletData);
              await AsyncStorage.setItem('walletAddress', firstAccount);
              await refreshWalletAccounts(firstAccount, { allowDisconnected: true });
              return walletData;
            }
          }
        } catch (accountReadError) {
          console.warn('Unable to read existing wallet session before connect:', accountReadError?.message || accountReadError);
        }
      }

      if ((shouldForceFreshSession || !canReuseExistingSession) && (currentConnection?.isConnected || activeProviderAtStart?.session)) {
        try {
          await safeDisconnect();
          setWallet(null);
          setAccounts([]);
          await AsyncStorage.removeItem('walletAddress');

          await new Promise((resolve) => setTimeout(resolve, 150));
        } catch (cleanupErr) {
          console.warn('Unable to clear stale wallet session before reconnect:', cleanupErr?.message || cleanupErr);
        }
      }

      const openWalletConnectProposal = async () => {
        await Promise.race([
          open(),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Wallet approval timed out. Please reopen MetaMask and try again.'));
            }, 30000);
          }),
        ]);
      };

      await AsyncStorage.removeItem(WALLETCONNECT_DEEPLINK_CHOICE_KEY).catch(() => null);
      try {
        await openWalletConnectProposal();
      } catch (openErr) {
        const lowerOpenError = String(openErr?.message || '').toLowerCase();
        const isStalePairingError = isWalletConnectStalePairingError(openErr);
        const isNamespaceConversionCrash = isWalletConnectNamespaceConversionCrash(openErr);
        const isLegacyScopeError =
          lowerOpenError.includes('authorizedscopes') ||
          lowerOpenError.includes('caip25') ||
          lowerOpenError.includes('eip155:31337');

        if (isStalePairingError || isNamespaceConversionCrash) {
          console.warn('[WalletConnect] Recovering from stale or incompatible proposal error and retrying fresh session.');

          await AsyncStorage.setItem(WALLETCONNECT_FORCE_NEW_SESSION_KEY, '1').catch(() => null);
          try {
            await safeDisconnect();
          } catch (recoverErr) {
            console.warn('Failed to disconnect during WalletConnect recovery:', recoverErr?.message || recoverErr);
          }

          setWallet(null);
          setAccounts([]);
          connectionStateRef.current = { isConnected: false, address: null };

          const clearedCoreKeyCount = await clearWalletConnectCoreStorage();
          if (clearedCoreKeyCount > 0) {
            console.warn(`[WalletConnect] Cleared ${clearedCoreKeyCount} WalletConnect storage key(s) before retry.`);
          }

          await AsyncStorage.multiRemove(['walletAddress', WALLETCONNECT_DEEPLINK_CHOICE_KEY]).catch(() => null);
          await new Promise((resolve) => setTimeout(resolve, 200));

          try {
            await openWalletConnectProposal();
          } catch (retryErr) {
            throw retryErr;
          }
        } else if (!isLegacyScopeError) {
          throw openErr;
        }

        if (isLegacyScopeError) {
          console.warn('[WalletConnect] Recovering from legacy 31337 scope error and retrying a fresh proposal.');
          await AsyncStorage.setItem(WALLETCONNECT_FORCE_NEW_SESSION_KEY, '1').catch(() => null);

          try {
            await safeDisconnect();
          } catch (recoverErr) {
            console.warn('Failed to disconnect during legacy-scope recovery:', recoverErr?.message || recoverErr);
          }

          setWallet(null);
          setAccounts([]);
          connectionStateRef.current = { isConnected: false, address: null };

          await AsyncStorage.multiRemove(['walletAddress', WALLETCONNECT_DEEPLINK_CHOICE_KEY]).catch(() => null);
          await new Promise((resolve) => setTimeout(resolve, 200));
          await openWalletConnectProposal();
        }
      }

      const waitForConnection = async (timeoutMs = 45000, intervalMs = 500) => {
        const start = Date.now();
        let didRpcFallbackProbe = false;

        while (Date.now() - start < timeoutMs) {
          const elapsed = Date.now() - start;
          
          const current = connectionStateRef.current;
          if (current.isConnected && current.address) {
            console.log(`[WalletConnect] Connection detected via hook state at ${elapsed}ms:`, current.address);
            return current.address;
          }

          const pollingProvider = providerRef.current || provider;
          const sessionAccounts = getEip155SessionAddresses(pollingProvider);
          const firstSessionAccount = sessionAccounts.find((entry) => typeof entry === 'string' && entry.startsWith('0x'));
          if (firstSessionAccount) {
            console.log(`[WalletConnect] Connection detected via session accounts at ${elapsed}ms:`, firstSessionAccount);
            return firstSessionAccount;
          }


          if (
            hasEip155SessionNamespace(pollingProvider) &&
            pollingProvider &&
            typeof pollingProvider.request === 'function' &&
            !didRpcFallbackProbe &&
            elapsed >= 4000
          ) {
            didRpcFallbackProbe = true;
            try {
              const result = await pollingProvider.request({ method: 'eth_accounts' });
              if (Array.isArray(result)) {
                const firstAccount = result.find((entry) => typeof entry === 'string' && entry.startsWith('0x'));
                if (firstAccount) {
                  console.log(`[WalletConnect] Connection detected via eth_accounts at ${elapsed}ms:`, firstAccount);
                  return firstAccount;
                }
              }
            } catch (err) {
              console.warn(`[WalletConnect] Polling at ${elapsed}ms, still waiting for eth_accounts:`, err?.message);
            }
          }

          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }

        console.error('[WalletConnect] Connection timeout after', Date.now() - start, 'ms');
        return null;
      };

      const connectedAddress = await waitForConnection();
      if (!connectedAddress) {
        throw new Error('Wallet connection timed out. Please return to the app after approving in MetaMask. If this continues, use a development build (expo run:android) instead of Expo Go.');
      }

      const verifyProvider = providerRef.current || provider;
      if (hasEip155SessionNamespace(verifyProvider) && verifyProvider && typeof verifyProvider.request === 'function') {
        try {
          const verifyAccounts = await verifyProvider.request({ method: 'eth_accounts' });
          const accountsArray = Array.isArray(verifyAccounts) ? verifyAccounts : [];
          const normalizedVerifyAccounts = accountsArray.map((acc) => String(acc || '').toLowerCase()).filter(Boolean);
          const normalizedConnected = String(connectedAddress || '').toLowerCase();
          
          if (!normalizedVerifyAccounts.includes(normalizedConnected)) {
            throw new Error('Connected address not found in provider accounts. Session may be stale.');
          }
        } catch (verifyErr) {
          console.warn('Provider account verification failed after connection:', verifyErr?.message || verifyErr);

        }
      }

      const walletData = { address: connectedAddress, isConnected: true };

      setWallet(walletData);
      await AsyncStorage.setItem('walletAddress', connectedAddress);
      await AsyncStorage.removeItem(WALLETCONNECT_FORCE_NEW_SESSION_KEY).catch(() => null);
      await refreshWalletAccounts(connectedAddress, { allowDisconnected: true });

      return walletData;
    } catch (err) {
      const errorMessage = err?.message || 'Failed to connect wallet';
      setError(errorMessage);

      const lower = errorMessage.toLowerCase();
      if (lower.includes('socket stalled') || lower.includes('relay.walletconnect')) {
        Alert.alert(
          'Wallet Network Error',
          'WalletConnect relay socket failed. Try switching network/VPN, then restart the app. You can also set EXPO_PUBLIC_WALLETCONNECT_RELAY_URL to wss://relay.walletconnect.com or wss://relay.walletconnect.org.'
        );
      } else if (!lower.includes('user rejected')) {
        Alert.alert('Connection Error', errorMessage);
      }

      return null;
    } finally {
      setIsConnecting(false);
      connectInFlightRef.current = false;
    }
  }, [open, provider, refreshWalletAccounts, safeDisconnect, clearWalletConnectCoreStorage, repairSessionRequiredNamespaces]);

  const reconnectWallet = useCallback(async () => {
    try {
      await safeDisconnect();
      setWallet(null);
      setAccounts([]);
      await AsyncStorage.removeItem('walletAddress');
      await new Promise((resolve) => setTimeout(resolve, 250));
      return await connectWallet();
    } catch (err) {
      const errorMessage = err?.message || 'Failed to reconnect wallet';
      setError(errorMessage);
      throw err;
    }
  }, [connectWallet, safeDisconnect]);

  const signMessage = useCallback(async (message, addressOverride = null) => {
    const activeAddress = addressOverride || walletRef.current?.address;
    if (!activeAddress) throw new Error('Wallet not connected');

    const activeProvider = providerRef.current || provider;
    if (!activeProvider || typeof activeProvider.request !== 'function') {
      throw new Error('Wallet provider is unavailable. Please reconnect wallet and try again.');
    }

    const requestSignature = async (targetProvider, targetAddress) => {
      const signatureValue = await targetProvider.request({
        method: 'personal_sign',
        params: [message, targetAddress],
      });

      if (typeof signatureValue !== 'string' || !signatureValue.trim()) {
        throw new Error('MetaMask did not return a valid signature.');
      }

      return signatureValue;
    };

    try {
      let signature;

      try {
        signature = await requestSignature(activeProvider, activeAddress);
      } catch (initialSignErr) {
        if (
          isWalletConnectStalePairingError(initialSignErr)
          || isWalletConnectNamespaceConversionCrash(initialSignErr)
        ) {
          console.warn('[WalletConnect] Signature request failed due to stale/incompatible session. Reconnecting and retrying once.');
          await AsyncStorage.setItem(WALLETCONNECT_FORCE_NEW_SESSION_KEY, '1').catch(() => null);

          const refreshedWallet = await reconnectWallet();
          const refreshedProvider = providerRef.current || provider;
          const refreshedAddress = String(
            refreshedWallet?.address || walletRef.current?.address || activeAddress
          ).trim();

          if (!refreshedProvider || typeof refreshedProvider.request !== 'function') {
            throw initialSignErr;
          }

          if (!refreshedAddress) {
            throw new Error('Wallet address is unavailable after reconnect. Please try again.');
          }

          signature = await requestSignature(refreshedProvider, refreshedAddress);
        } else {
          throw initialSignErr;
        }
      }

      return signature;
    } catch (err) {
      console.error('Signing error:', err);
      const errorMsg = String(err?.message || err || '').trim();
      setError(errorMsg);

      if (errorMsg.toLowerCase().includes('user denied') || errorMsg.toLowerCase().includes('denied transaction')) {
        throw new Error('You cancelled the signing request. Please try again and approve in MetaMask.');
      }
      
      throw err;
    }
  }, [provider, reconnectWallet]);

  const getChainId = useCallback(async () => {
    if (!provider) {
      throw new Error('Wallet provider unavailable. Please reconnect wallet.');
    }

    try {
      const chainId = await provider.request({ method: 'eth_chainId' });
      const normalizedChainId = normalizeChainIdHex(chainId);
      if (!normalizedChainId) {
        throw new Error('Wallet returned an invalid chain id.');
      }
      return normalizedChainId;
    } catch (err) {
      console.error('Unable to read chain id:', err);
      throw new Error('Unable to verify wallet network. Please reconnect your wallet.');
    }
  }, [provider]);

  const switchOrAddChain = useCallback(async (targetChainId) => {
    if (!provider) {
      throw new Error('Wallet provider unavailable. Please reconnect wallet.');
    }

    const normalizedTargetChainId = normalizeChainIdHex(targetChainId);
    const chainConfig = CHAIN_CONFIGS[normalizedTargetChainId];

    if (!chainConfig) {
      throw new Error('Unsupported chain configuration.');
    }

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: normalizedTargetChainId }],
      });

      return normalizedTargetChainId;
    } catch (err) {
      const code = Number(err?.code);
      const lowerMessage = String(err?.message || '').toLowerCase();
      const shouldAddChain =
        code === 4902 ||
        lowerMessage.includes('unknown chain') ||
        lowerMessage.includes('unrecognized chain') ||
        lowerMessage.includes('does not exist');

      if (!shouldAddChain) {
        throw err;
      }
    }

    const addChainParams = {
      chainId: normalizedTargetChainId,
      chainName: chainConfig.chainName,
      nativeCurrency: chainConfig.nativeCurrency,
      rpcUrls: chainConfig.rpcUrls.filter(Boolean),
    };

    const safeExplorerUrls = chainConfig.blockExplorerUrls.filter(Boolean);
    if (safeExplorerUrls.length > 0) {
      addChainParams.blockExplorerUrls = safeExplorerUrls;
    }

    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [addChainParams],
    });

    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: normalizedTargetChainId }],
    });

    return normalizedTargetChainId;
  }, [provider]);

  const ensureSupportedPolygonNetwork = useCallback(async () => {
    const activeProvider = providerRef.current || provider;
    if (hasLegacyUnsupportedHardhatScope(activeProvider)) {
      console.warn('[WalletConnect] Reconnecting to clear legacy eip155:31337 scope before payment network checks.');
      await AsyncStorage.setItem(WALLETCONNECT_FORCE_NEW_SESSION_KEY, '1').catch(() => null);
      await reconnectWallet();
    }

    const currentChainId = await getChainId();
    if (SUPPORTED_POLYGON_CHAIN_IDS.has(currentChainId)) {
      return currentChainId;
    }

    const attemptSwitchFlow = async () => {
      await switchOrAddChain(DEFAULT_PREFERRED_CHAIN_ID);
      const activeChainId = await getChainId();
      if (SUPPORTED_POLYGON_CHAIN_IDS.has(activeChainId)) {
        return activeChainId;
      }
      return null;
    };

    try {
      const switchedChain = await attemptSwitchFlow();
      if (switchedChain) {
        return switchedChain;
      }
    } catch (err) {


      if (isWalletConnectChainApprovalError(err)) {
        try {
          await reconnectWallet();
          const activeChainAfterReconnect = await getChainId();
          if (SUPPORTED_POLYGON_CHAIN_IDS.has(activeChainAfterReconnect)) {
            return activeChainAfterReconnect;
          }

          const switchedAfterReconnect = await attemptSwitchFlow();
          if (switchedAfterReconnect) {
            return switchedAfterReconnect;
          }
        } catch (retryErr) {
          if (!isWalletConnectChainApprovalError(retryErr)) {
            const retryMessage = String(retryErr?.message || '').trim();
            if (retryMessage) {
              throw new Error(retryMessage);
            }
          }
        }
      }

      if (!isWalletConnectChainApprovalError(err)) {
        const detailedMessage = String(err?.message || '').trim();
        if (detailedMessage) {
          throw new Error(detailedMessage);
        }
      }
    }

    throw new Error(
      `Please reconnect wallet and switch to Polygon Hardhat Local (chain id ${HARDHAT_CHAIN_ID_DEC}). ` +
      'If needed, remove the existing WalletConnect session in MetaMask first.'
    );
  }, [getChainId, switchOrAddChain, reconnectWallet, provider]);

  const buildTransactionFeeParams = useCallback(async ({ from, to, value, data }) => {
    const activeProvider = providerRef.current || provider;
    if (!activeProvider || typeof activeProvider.request !== 'function') {
      return {};
    }

    let gasLimitWei = null;
    try {
      const estimatePayload = { from, to };
      if (value) {
        estimatePayload.value = value;
      }
      if (data) {
        estimatePayload.data = data;
      }

      const estimatedGas = await activeProvider.request({
        method: 'eth_estimateGas',
        params: [estimatePayload],
      });
      gasLimitWei = parseRpcBigInt(estimatedGas);
    } catch (gasErr) {
      console.warn('Unable to estimate gas for payment transaction:', gasErr?.message || gasErr);
    }

    let baseFeeWei = null;
    try {
      const pendingBlock = await activeProvider.request({
        method: 'eth_getBlockByNumber',
        params: ['pending', false],
      });
      baseFeeWei = parseRpcBigInt(pendingBlock?.baseFeePerGas);
    } catch (blockErr) {
      console.warn('Unable to read pending block base fee:', blockErr?.message || blockErr);
    }

    if (baseFeeWei && baseFeeWei > 0n) {
      let priorityFeeWei = null;

      try {
        const suggestedPriority = await activeProvider.request({ method: 'eth_maxPriorityFeePerGas' });
        priorityFeeWei = parseRpcBigInt(suggestedPriority);
      } catch {
        priorityFeeWei = null;
      }

      if (!priorityFeeWei || priorityFeeWei <= 0n) {
        try {
          const gasPrice = await activeProvider.request({ method: 'eth_gasPrice' });
          const gasPriceWei = parseRpcBigInt(gasPrice);
          if (gasPriceWei && gasPriceWei > baseFeeWei) {
            priorityFeeWei = gasPriceWei - baseFeeWei;
          }
        } catch {
          priorityFeeWei = null;
        }
      }

      if (!priorityFeeWei || priorityFeeWei <= 0n) {
        priorityFeeWei = DEFAULT_PRIORITY_FEE_WEI;
      }

      if (priorityFeeWei < ONE_GWEI_WEI) {
        priorityFeeWei = ONE_GWEI_WEI;
      }


      const maxFeePerGasWei = baseFeeWei * 2n + priorityFeeWei;
      const eip1559Params = {
        maxPriorityFeePerGas: toHexWei(priorityFeeWei),
        maxFeePerGas: toHexWei(maxFeePerGasWei),
      };

      if (gasLimitWei && gasLimitWei > 0n) {
        eip1559Params.gas = toHexWei(gasLimitWei);
      }

      return eip1559Params;
    }

    try {
      const gasPrice = await activeProvider.request({ method: 'eth_gasPrice' });
      const gasPriceWei = parseRpcBigInt(gasPrice);
      if (gasPriceWei && gasPriceWei > 0n) {
        const legacyParams = { gasPrice: toHexWei(gasPriceWei) };
        if (gasLimitWei && gasLimitWei > 0n) {
          legacyParams.gas = toHexWei(gasLimitWei);
        }
        return legacyParams;
      }
    } catch (gasPriceErr) {
      console.warn('Unable to read gas price for payment fallback:', gasPriceErr?.message || gasPriceErr);
    }

    if (gasLimitWei && gasLimitWei > 0n) {
      return { gas: toHexWei(gasLimitWei) };
    }

    return {};
  }, [provider]);

  const sendPaymentTransaction = useCallback(async ({ toAddress, amountPol, fromAddress = null }) => {
    const activeProvider = providerRef.current || provider;
    if (!activeProvider || typeof activeProvider.request !== 'function') {
      throw new Error('Wallet provider unavailable. Please reconnect wallet.');
    }

    const safeToAddress = String(toAddress || '').trim();
    if (!isHexWalletAddress(safeToAddress)) {
      throw new Error('Brand wallet address is invalid. Please contact support.');
    }

    const normalizedAmount = normalizePolAmount(amountPol);
    const value = toWeiHex(normalizedAmount);

    const chainId = await ensureSupportedPolygonNetwork();

    const preferredAddress = String(fromAddress || wallet?.address || '').trim();
    let availableAccounts = await refreshWalletAccounts(preferredAddress);

    if (!Array.isArray(availableAccounts) || availableAccounts.length === 0) {
      try {
        const requested = await activeProvider.request({ method: 'eth_requestAccounts' });
        if (Array.isArray(requested)) {
          availableAccounts = requested;
        }
      } catch (err) {
        console.error('Failed to request wallet accounts:', err);
      }
    }

    const senderAddress =
      (Array.isArray(availableAccounts)
        ? availableAccounts.find((entry) => normalizeAddress(entry) === normalizeAddress(preferredAddress))
        : null) ||
      (Array.isArray(availableAccounts) ? availableAccounts[0] : null) ||
      preferredAddress;

    if (!isHexWalletAddress(senderAddress)) {
      throw new Error('Wallet address is unavailable. Please reconnect MetaMask and try again.');
    }

    try {
      const txPayload = {
        from: senderAddress,
        to: safeToAddress,
        value,
      };

      const feeParams = await buildTransactionFeeParams(txPayload);

      const txHash = await activeProvider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            ...txPayload,
            ...feeParams,
          },
        ],
      });

      if (typeof txHash !== 'string' || !txHash.trim()) {
        throw new Error('MetaMask did not return a transaction hash.');
      }

      return {
        txHash,
        chainId,
        fromAddress: senderAddress,
        toAddress: safeToAddress,
        amountPol: normalizedAmount,
      };
    } catch (err) {
      console.error('Payment transaction failed:', err);
      const message = err?.message || 'Failed to submit transaction to MetaMask.';
      setError(message);
      throw err;
    }
  }, [provider, wallet?.address, refreshWalletAccounts, normalizeAddress, ensureSupportedPolygonNetwork, buildTransactionFeeParams]);

  const sendContractTransaction = useCallback(async ({
    toAddress,
    data,
    valueWei = '0',
    fromAddress = null,
  }) => {
    const activeProvider = providerRef.current || provider;
    if (!activeProvider || typeof activeProvider.request !== 'function') {
      throw new Error('Wallet provider unavailable. Please reconnect wallet.');
    }

    const safeToAddress = String(toAddress || '').trim();
    if (!isHexWalletAddress(safeToAddress)) {
      throw new Error('Contract address is invalid.');
    }

    const safeData = normalizeHexDataPayload(data);
    const value = normalizeWeiHexValue(valueWei);

    const chainId = await ensureSupportedPolygonNetwork();

    const preferredAddress = String(fromAddress || wallet?.address || '').trim();
    let availableAccounts = await refreshWalletAccounts(preferredAddress);

    if (!Array.isArray(availableAccounts) || availableAccounts.length === 0) {
      try {
        const requested = await activeProvider.request({ method: 'eth_requestAccounts' });
        if (Array.isArray(requested)) {
          availableAccounts = requested;
        }
      } catch (err) {
        console.error('Failed to request wallet accounts for contract transaction:', err);
      }
    }

    const senderAddress =
      (Array.isArray(availableAccounts)
        ? availableAccounts.find((entry) => normalizeAddress(entry) === normalizeAddress(preferredAddress))
        : null) ||
      (Array.isArray(availableAccounts) ? availableAccounts[0] : null) ||
      preferredAddress;

    if (!isHexWalletAddress(senderAddress)) {
      throw new Error('Wallet address is unavailable. Please reconnect MetaMask and try again.');
    }

    try {
      const txPayload = {
        from: senderAddress,
        to: safeToAddress,
        data: safeData,
        value,
      };

      const feeParams = await buildTransactionFeeParams(txPayload);

      const txHash = await activeProvider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            ...txPayload,
            ...feeParams,
          },
        ],
      });

      if (typeof txHash !== 'string' || !txHash.trim()) {
        throw new Error('MetaMask did not return a transaction hash.');
      }

      return {
        txHash,
        chainId,
        fromAddress: senderAddress,
        toAddress: safeToAddress,
      };
    } catch (err) {
      console.error('Contract transaction failed:', err);
      const message = err?.message || 'Failed to submit contract transaction to MetaMask.';
      setError(message);
      throw err;
    }
  }, [provider, wallet?.address, refreshWalletAccounts, normalizeAddress, ensureSupportedPolygonNetwork, buildTransactionFeeParams]);

  const watchNftInWallet = useCallback(async ({ contractAddress, tokenId, image = null, name = null, description = null }) => {
    const activeProvider = providerRef.current || provider;
    if (!activeProvider || typeof activeProvider.request !== 'function') {
      throw new Error('Wallet provider unavailable. Please reconnect wallet.');
    }

    const safeContractAddress = String(contractAddress || '').trim();
    if (!isHexWalletAddress(safeContractAddress)) {
      throw new Error('Contract address is invalid for MetaMask import.');
    }

    const normalizedTokenId = String(tokenId ?? '').trim();
    if (!/^\d+$/.test(normalizedTokenId)) {
      throw new Error('Token ID is invalid for MetaMask import.');
    }

    await ensureSupportedPolygonNetwork();

    const options = {
      address: safeContractAddress,
      tokenId: normalizedTokenId,
    };

    const safeImage = String(image || '').trim();
    if (safeImage && /^https?:\/\//i.test(safeImage)) {
      options.image = safeImage;
    }

    const safeName = String(name || '').trim();
    if (safeName) {
      options.name = safeName;
    }

    const safeDescription = String(description || '').trim();
    if (safeDescription) {
      options.description = safeDescription;
    }

    try {
      const accepted = await activeProvider.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721',
          options,
        },
      });

      return Boolean(accepted);
    } catch (err) {
      const lowerMessage = String(err?.message || '').toLowerCase();
      if (
        lowerMessage.includes('user rejected') ||
        lowerMessage.includes('user denied') ||
        lowerMessage.includes('cancelled')
      ) {
        return false;
      }

      throw err;
    }
  }, [provider, ensureSupportedPolygonNetwork]);

  const disconnectWallet = useCallback(async () => {
    let disconnectError = null;
    try {
      await safeDisconnect();
    } catch (err) {
      disconnectError = err;
      console.error('Disconnect error:', err);
    }

    setWallet(null);
    setAccounts([]);
    setError(null);
    connectionStateRef.current = { isConnected: false, address: null };
    connectInFlightRef.current = false;

    await AsyncStorage.multiRemove(['walletAddress', WALLETCONNECT_DEEPLINK_CHOICE_KEY]).catch((storageErr) => {
      console.error('Error clearing wallet storage:', storageErr);
    });
    await AsyncStorage.setItem(WALLETCONNECT_FORCE_NEW_SESSION_KEY, '1').catch((storageErr) => {
      console.error('Error setting force-new-wallet-session flag:', storageErr);
    });

    if (disconnectError) {

      return;
    }
  }, [safeDisconnect]);

  return (
    <WalletContext.Provider value={{
      wallet,
      accounts,
      isConnecting,
      error,
      connectWallet,
      reconnectWallet,
      refreshWalletAccounts,
      disconnectWallet,
      signMessage,
      ensureSupportedPolygonNetwork,
      getChainId,
      sendPaymentTransaction,
      sendContractTransaction,
      watchNftInWallet,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const WalletProvider = ({ children }) => {
  if (!PROJECT_ID) {
    console.error('Missing EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID environment variable');
  }

  const executionEnvironment = String(Constants.executionEnvironment || '').trim();
  const appOwnership = String(Constants.appOwnership || '').trim();
  const isExpoGo = executionEnvironment === 'storeClient' || appOwnership === 'expo';

  const configuredNativeRedirect = String(process.env.EXPO_PUBLIC_WALLETCONNECT_NATIVE_REDIRECT || '').trim();
  const configuredUniversalRedirect = String(process.env.EXPO_PUBLIC_WALLETCONNECT_UNIVERSAL_REDIRECT || '').trim();

  const runtimeRedirectToCallback = ExpoLinking.createURL('wc');
  const defaultNativeRedirectUrl = 'zeal://wc';
  const nativeRedirectUrl = isExpoGo
    ? runtimeRedirectToCallback
    : (configuredNativeRedirect || defaultNativeRedirectUrl);
  const universalRedirectUrl = isHttpsUrl(configuredUniversalRedirect)
    ? configuredUniversalRedirect
    : '';

  const providerMetadata = useMemo(() => {
    const redirectMetadata = universalRedirectUrl
      ? {
        native: nativeRedirectUrl,
        universal: universalRedirectUrl,
      }
      : {
        native: nativeRedirectUrl,
      };

    return {
      name: 'Zeal',
      description: 'Zeal Digital Seal App',
      url: 'https://zealapp.com',
      icons: ['https://zealapp.com/icon.png'],
      redirect: redirectMetadata,
    };
  }, [nativeRedirectUrl, universalRedirectUrl]);

  useEffect(() => {
    if (configuredUniversalRedirect && !universalRedirectUrl) {
      console.warn('[WalletConnect] Ignoring invalid universal redirect. It must be an https URL.');
    }

    if (isExpoGo && configuredNativeRedirect) {
      console.warn(
        '[WalletConnect] Ignoring EXPO_PUBLIC_WALLETCONNECT_NATIVE_REDIRECT in Expo Go. Using Expo runtime callback URL instead.'
      );
    }

    console.log(
      '[WalletConnect] executionEnvironment:',
      Constants.executionEnvironment,
      'appOwnership:',
      Constants.appOwnership,
      'expoCreatedRedirect:',
      runtimeRedirectToCallback,
      'nativeRedirect:',
      nativeRedirectUrl,
      'universalRedirect:',
      universalRedirectUrl
    );
    console.log('[WalletConnect] relayUrl:', RELAY_URL);
  }, [
    nativeRedirectUrl,
    universalRedirectUrl,
    runtimeRedirectToCallback,
    configuredUniversalRedirect,
    configuredNativeRedirect,
    isExpoGo,
  ]);

  return (
    <>
      <WalletConnectModal
        projectId={PROJECT_ID || ''}
        providerMetadata={providerMetadata}
        relayUrl={RELAY_URL}
        sessionParams={WALLETCONNECT_SESSION_PARAMS}
      />
      <WalletProviderInner>
        {children}
      </WalletProviderInner>
    </>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};