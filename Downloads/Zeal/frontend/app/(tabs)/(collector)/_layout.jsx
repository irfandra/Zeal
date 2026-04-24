import { Tabs, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { HapticTab } from '@/components/shared/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRole } from '@/components/context/RoleContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { role, isRoleHydrated } = useRole();
  const hasNavigatedRef = useRef(false);
  const isInCollectorRoute = segments.includes('(collector)');

  useEffect(() => {
    if (!isRoleHydrated || !isInCollectorRoute || role === 'collector') {
      hasNavigatedRef.current = false;
      return;
    }

    if (hasNavigatedRef.current) {
      return;
    }

    const creatorCollectionPath = '/(tabs)/(creator)/(tabs)/collection';

    if (pathname === creatorCollectionPath) {
      hasNavigatedRef.current = false;
      return;
    }

    hasNavigatedRef.current = true;
    router.push(creatorCollectionPath);
  }, [isRoleHydrated, isInCollectorRoute, role, pathname, router]);

  if (!isRoleHydrated) {
    return null;
  }

  if (!isInCollectorRoute) {
    return null;
  }

  if (role !== 'collector') {
    return null;
  }

  const isDetailScreen =
    segments.includes('brand') ||
    segments.includes('product') ||
    (segments.includes('collection') && segments.length >= 4);

  const tabBarStyle = isDetailScreen
    ? { display: 'none', height: 0, opacity: 0 }
    : undefined;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle,
      }}
    >
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rack"
        options={{
          title: 'Your Rack',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="cube.box.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="authcheck"
        options={{
          title: 'Authenticate',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="qrcode.viewfinder" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}