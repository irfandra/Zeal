import { Stack } from 'expo-router';

export default function LegalLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="privacypolicy"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="useterms"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="faquser"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="changepass"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}