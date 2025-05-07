// /app/(tabs)/games/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function GamesStackLayout() {
  return (
    <Stack
    // Configurar opciones globales para este Stack
    // screenOptions={{
    //   headerStyle: { backgroundColor: '#f4511e' },
    //   headerTintColor: '#fff',
    // }}
    >
      <Stack.Screen
        name="index" // Corresponde a /app/(tabs)/games/index.tsx
        options={{ title: 'Seleccionar Juego' }}
      />
      <Stack.Screen
        name="mimicsGameSetup" // Corresponde a /app/(tabs)/games/mimicsGameSetup.tsx
        options={{ title: 'Configurar Mímica' }}
      />
      <Stack.Screen
        name="mimicsGame" // Corresponde a /app/(tabs)/games/mimicsGame.tsx
        options={{
          title: '¡A Jugar Mímica!',
          headerBackVisible: false, // Para que el usuario no pueda volver con el botón de atrás del header
          // gestureEnabled: false, // Opcional: deshabilita el gesto de swipe para volver en iOS
        }}
      />
    </Stack>
  );
}