import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useRole } from "../../components/context/RoleContext";
import { brandService } from '../../services/brandService';

export default function TabRoleToggle() {
  const router = useRouter();
  const { role, setRole } = useRole();
  const [isSwitching, setIsSwitching] = useState(false);

  const switchToCollector = async () => {
    if (isSwitching || role === 'collector') {
      return;
    }

    setIsSwitching(true);
    try {
      await setRole('collector');
      router.push('/(tabs)/(collector)/marketplace');
    } finally {
      setIsSwitching(false);
    }
  };

  const switchToCreator = async () => {
    if (isSwitching || role === 'creator') {
      return;
    }

    setIsSwitching(true);
    try {
      const hasBrand = await brandService.hasCreatorBrand();
      await setRole('creator');

      if (hasBrand) {
        router.push('/(tabs)/(creator)/(tabs)/collection');
      } else {
        router.push('/(tabs)/(creator)/register-company');
      }
    } catch (error) {
      Alert.alert('Role Switch Failed', error?.message || 'Unable to switch account mode.');
    } finally {
      setIsSwitching(false);
    }
  };

  const RoleChip = ({ label, active, onPress }) => {
    const isDisabled = isSwitching;
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={{
          backgroundColor: active ? '#000' : 'transparent',
          borderRadius: 50,
          paddingVertical: 8,
          paddingHorizontal: 14,
          opacity: isDisabled ? 0.7 : 1,
        }}
      >
        <Text
          style={{
            color: active ? '#fff' : '#666',
            fontSize: 12,
            fontWeight: active ? '700' : '600',
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderColor: '#8F8F8F',
        borderRadius: 50,
        borderWidth: 1,
        padding: 4,
        gap: 2,
      }}
    >
      <RoleChip label="Collector" active={role === 'collector'} onPress={switchToCollector} />
      <RoleChip label="Creator" active={role === 'creator'} onPress={switchToCreator} />
      {isSwitching && <ActivityIndicator size="small" color="#444" style={{ marginLeft: 6 }} />}
    </View>
  );
}
