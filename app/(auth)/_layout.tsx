// /app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

// Simple stack for login/signup screens
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Hiding header for a cleaner auth flow, 
          individual screens can set titles if needed */}
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}