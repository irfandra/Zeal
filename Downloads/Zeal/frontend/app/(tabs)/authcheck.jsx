import { Redirect } from 'expo-router';
import { useRole } from '../../components/context/RoleContext';

export default function AuthcheckGateway() {
  const { role, isRoleHydrated } = useRole();

  if (!isRoleHydrated) {
    return null;
  }

  if (role === 'creator') {
    return <Redirect href="/(tabs)/(creator)/(tabs)/authcheck" />;
  }

  return <Redirect href="/(tabs)/(collector)/authcheck" />;
}
