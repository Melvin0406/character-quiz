// /app/(tabs)/settings/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function SettingsStackLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" // Corresponde a /app/(tabs)/settings/index.tsx
        options={{ title: 'Ajustes' }} 
      />
      {/* Aquí podrías añadir más pantallas de ajustes en el futuro, ej:
      <Stack.Screen name="profile" options={{ title: 'Editar Perfil' }} />
      */}
    </Stack>
  );
}