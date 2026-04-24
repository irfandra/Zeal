import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const RoleContext = createContext();
const ACTIVE_ROLE_STORAGE_KEY = 'activeRole';
const CURRENT_USER_STORAGE_KEY = 'currentUser';

const normalizeRole = (value) => {
  const role = String(value || '').trim().toUpperCase();
  if (role === 'BRAND' || role === 'CREATOR') {
    return 'creator';
  }
  return 'collector';
};

const normalizeText = (value) => String(value || '').trim();

const normalizeCurrentUser = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const parsedId = Number(value.id);
  const normalized = {
    id: Number.isFinite(parsedId) ? parsedId : null,
    userName: normalizeText(value.userName || value.username),
    email: normalizeText(value.email),
    firstName: normalizeText(value.firstName),
    lastName: normalizeText(value.lastName),
    phoneNumber: normalizeText(value.phoneNumber),
    walletAddress: normalizeText(value.walletAddress),
    role: normalizeText(value.role),
    authType: normalizeText(value.authType),
    emailVerified: Boolean(value.emailVerified),
    walletVerified: Boolean(value.walletVerified),
    createdAt: normalizeText(value.createdAt),
    lastLoginAt: normalizeText(value.lastLoginAt),
  };

  if (
    normalized.id == null &&
    !normalized.userName &&
    !normalized.email &&
    !normalized.firstName &&
    !normalized.lastName &&
    !normalized.walletAddress
  ) {
    return null;
  }

  return normalized;
};

export const mapBackendRoleToAppRole = (backendRole) => normalizeRole(backendRole);

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

export const RoleProvider = ({ children }) => {
  const [role, setRoleState] = useState('collector');
  const [currentUser, setCurrentUserState] = useState(null);
  const [isRoleHydrated, setIsRoleHydrated] = useState(false);
  const [isUserHydrated, setIsUserHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrateRole = async () => {
      try {
        const [[, storedRole], [, storedUser]] = await AsyncStorage.multiGet([
          ACTIVE_ROLE_STORAGE_KEY,
          CURRENT_USER_STORAGE_KEY,
        ]);

        if (isMounted && storedRole) {
          setRoleState(normalizeRole(storedRole));
        }

        if (isMounted && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setCurrentUserState(normalizeCurrentUser(parsedUser));
          } catch (parseError) {
            console.warn('Failed to parse current user from storage:', parseError);
          }
        }
      } catch (error) {
        console.warn('Failed to read session from storage:', error);
      } finally {
        if (isMounted) {
          setIsRoleHydrated(true);
          setIsUserHydrated(true);
        }
      }
    };

    hydrateRole();

    return () => {
      isMounted = false;
    };
  }, []);

  const setRole = useCallback(async (nextRole) => {
    const normalized = normalizeRole(nextRole);
    setRoleState(normalized);
    await AsyncStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, normalized);
    return normalized;
  }, []);

  const setRoleFromBackend = useCallback(
    async (backendRole) => setRole(mapBackendRoleToAppRole(backendRole)),
    [setRole]
  );

  const setCurrentUser = useCallback(async (nextUser) => {
    const normalized = normalizeCurrentUser(nextUser);
    setCurrentUserState(normalized);

    if (normalized) {
      await AsyncStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(normalized));
    } else {
      await AsyncStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }

    return normalized;
  }, []);

  const clearCurrentUser = useCallback(async () => {
    setCurrentUserState(null);
    await AsyncStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  }, []);

  const clearSession = useCallback(async () => {
    setRoleState('collector');
    setCurrentUserState(null);
    await AsyncStorage.multiRemove([ACTIVE_ROLE_STORAGE_KEY, CURRENT_USER_STORAGE_KEY]);
  }, []);

  const clearRole = useCallback(async () => {
    setRoleState('collector');
    await AsyncStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
  }, []);

  const [brand, setBrand] = useState({
    id: 1,
    user_id: 1,
    brand_name: 'Hermes',
    company_email: 'hermes@plvmh.com',
    company_address: '24 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
    company_wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    logo: 'https://via.placeholder.com/100/ff6600/ffffff?text=PL',
    description: 'Hermès International S.A., or simply Hermès, is a French high fashion luxury goods manufacturer established in 1837. It specializes in leather, lifestyle accessories, home furnishings, perfumery, jewelry, watches and ready-to-wear.',
    verified: true,
    created_at: '2024-01-01',
    updated_at: '2024-03-28',
  });

  const contextValue = useMemo(
    () => ({
      role,
      setRole,
      setRoleFromBackend,
      clearRole,
      currentUser,
      setCurrentUser,
      clearCurrentUser,
      clearSession,
      isRoleHydrated,
      isUserHydrated,
      brand,
      setBrand,
    }),
    [
      role,
      setRole,
      setRoleFromBackend,
      clearRole,
      currentUser,
      setCurrentUser,
      clearCurrentUser,
      clearSession,
      isRoleHydrated,
      isUserHydrated,
      brand,
      setBrand,
    ]
  );

  return <RoleContext.Provider value={contextValue}>{children}</RoleContext.Provider>;
};