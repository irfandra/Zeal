import { Redirect } from 'expo-router';

export default function WalletConnectCallback() {
  return <Redirect href="/(auth)/login" />;
}
