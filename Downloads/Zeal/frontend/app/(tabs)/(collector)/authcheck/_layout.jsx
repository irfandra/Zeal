
import { Stack } from 'expo-router';

export default function AuthCheckLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="selectnft" />
      <Stack.Screen name="fromrack" />
      <Stack.Screen name="frommarketplace" />
      <Stack.Screen name="result" />
    </Stack>
  );
}