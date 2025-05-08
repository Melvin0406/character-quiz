// /app/_layout.tsx
import { Slot } from 'expo-router';
import React from 'react';
import { SelectionProvider } from '../context/SelectionContext'; // Ajusta la ruta si es necesario

export default function RootLayout() {
  // Aquí puedes añadir otros providers globales si los tienes
  return (
    <SelectionProvider>
      <Slot />
    </SelectionProvider>
  );
}