import { Redirect } from 'expo-router';
import { useRole } from '../../components/context/RoleContext';

export default function ProfileGateway() {
  const { role, isRoleHydrated } = useRole();

  if (!isRoleHydrated) {
    return null;
  }

  if (role === 'creator') {
    return <Redirect href="/(tabs)/(creator)/(tabs)/creatorProfile" />;
  }

  return <Redirect href="/(tabs)/(collector)/profile" />;
}
