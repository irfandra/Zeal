import { Redirect } from 'expo-router';
import { useRole } from '../../components/context/RoleContext';

export default function YourRackGateway() {
  const { role, isRoleHydrated } = useRole();

  if (!isRoleHydrated) {
    return null;
  }

  if (role === 'creator') {
    return <Redirect href="/(tabs)/(creator)/(tabs)/order" />;
  }

  return <Redirect href="/(tabs)/(collector)/rack" />;
}
