// /app/(tabs)/characters/_layout.tsx 

import { Stack } from 'expo-router';
import React from 'react'; // Añadir import React si no estaba

export default function CharactersStackLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" // -> /app/(tabs)/characters/index.tsx (AnimeListScreen)
        options={{ title: 'Animes' }} // O el título que prefieras
      />
      <Stack.Screen 
        name="[id]"  // -> /app/(tabs)/characters/[id].tsx (CharactersScreen)
        options={{ title: 'Personajes' }} 
      />
      {/* Otras pantallas dentro de esta pestaña si las hubiera */}
    </Stack>
  );
}