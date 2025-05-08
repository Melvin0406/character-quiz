// /app/index.tsx
import { Redirect } from 'expo-router';
import React from 'react';

export default function RootIndex() {
  // Este componente no renderiza UI, solo le dice a Expo Router
  // que navegue inmediatamente a la ruta "/home".

  // Expo Router mapea app/(tabs)/home/index.tsx a la ruta "/home"
  // (ignorando "(tabs)" y usando "index" como default para "home").
  return <Redirect href="/home" />;
}