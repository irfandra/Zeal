import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="forgotpassword"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="accountactivation"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="changepassword"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

