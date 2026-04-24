import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useRole } from '@/components/context/RoleContext';
import { brandService } from '@/services/brandService';

export default function CreatorLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { role, isRoleHydrated } = useRole();
  const hasCrossStackRedirectRef = useRef(false);
  const [hasCreatorBrand, setHasCreatorBrand] = useState(null);
  const [isCheckingBrand, setIsCheckingBrand] = useState(false);

  const isInCreatorRoute = segments.includes('(creator)');
  const isRegisterCompanyRoute = isInCreatorRoute && segments.includes('register-company');
  const shouldCheckBrand = isRoleHydrated && isInCreatorRoute && role === 'creator';

  useEffect(() => {
    let isMounted = true;

    if (!shouldCheckBrand) {
      if (isMounted) {
        setHasCreatorBrand(null);
        setIsCheckingBrand(false);
      }

      return () => {
        isMounted = false;
      };
    }

    if (isMounted) {
      setIsCheckingBrand(true);
    }

    const checkCreatorBrand = async () => {
      try {
        const exists = await brandService.hasCreatorBrand();
        if (isMounted) {
          setHasCreatorBrand(Boolean(exists));
        }
      } catch {
        if (isMounted) {
          setHasCreatorBrand(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingBrand(false);
        }
      }
    };

    checkCreatorBrand();

    return () => {
      isMounted = false;
    };
  }, [shouldCheckBrand, isRegisterCompanyRoute]);

  useEffect(() => {
    if (!isRoleHydrated || !isInCreatorRoute) {
      hasCrossStackRedirectRef.current = false;
      return;
    }

    if (role !== 'creator') {
      const collectorPath = '/(tabs)/(collector)/marketplace';
      if (hasCrossStackRedirectRef.current) {
        return;
      }

      if (pathname !== collectorPath) {
        hasCrossStackRedirectRef.current = true;
        router.push(collectorPath);
      }
      return;
    }

    hasCrossStackRedirectRef.current = false;

    if (isCheckingBrand || hasCreatorBrand == null) {
      return;
    }

    if (!hasCreatorBrand) {
      const registerPath = '/(tabs)/(creator)/register-company';
      if (pathname !== registerPath) {
        router.replace(registerPath);
      }
    }
  }, [
    isRoleHydrated,
    isInCreatorRoute,
    role,
    hasCreatorBrand,
    isCheckingBrand,
    pathname,
    router,
  ]);

  if (!isRoleHydrated) {
    return null;
  }

  if (!isInCreatorRoute) {
    return null;
  }

  if (role !== 'creator') {
    return null;
  }

  if (isCheckingBrand && !isRegisterCompanyRoute) {
    return null;
  }

  if (hasCreatorBrand === false && !isRegisterCompanyRoute) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {}
      <Stack.Screen name="collection-detail" options={{ headerShown: false }} />
      <Stack.Screen name="collection-detail-listed" options={{ headerShown: false }} />
      <Stack.Screen name="new-collection-continue" options={{ headerShown: false }} />
      <Stack.Screen name="new-collection" options={{ headerShown: false }} />
      <Stack.Screen name="edit-collection" options={{ headerShown: false }} />
      <Stack.Screen name="item-orders-dynamic" options={{ headerShown: false }} />
      <Stack.Screen name="item-detail" options={{ headerShown: false }} />
      <Stack.Screen name="add-variation" options={{ headerShown: false }} />
      <Stack.Screen name="generate-all-qr-collections" options={{ headerShown: false }} />
      <Stack.Screen name="register-company" options={{ headerShown: false }} />
    </Stack>
  );
}