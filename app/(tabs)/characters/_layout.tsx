// /app/(tabs)/characters/_layout.tsx 
import FontAwesome from '@expo/vector-icons/FontAwesome'; // Para el icono
import { Stack, usePathname, useRouter } from 'expo-router'; // Importar useRouter y usePathname
import React from 'react';
import { Pressable } from 'react-native';

// Componente para el botón del header
function MyListToggleButton() {
  const router = useRouter();
  const pathname = usePathname(); // Obtiene la ruta actual, ej: "/characters" o "/characters/myList"

  const isOnMyListScreen = pathname === '/characters/myList';

  const navigateTo = () => {
    if (isOnMyListScreen) {
      router.push('/characters'); // Ir a la lista general
    } else {
      router.push('/characters/myList'); // Ir a mi lista
    }
  };

  return (
    <Pressable onPress={navigateTo} style={{ marginRight: 15, padding: 5 }}>
      <FontAwesome 
        name={isOnMyListScreen ? "list-alt" : "heart"} // Icono diferente para cada estado
        size={22} 
        color="#007AFF" // Color del botón/icono
      />
    </Pressable>
  );
}

export default function CharactersStackLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" // -> /app/(tabs)/characters/index.tsx (AnimeListScreen)
        options={{ 
          title: 'Animes',
          headerRight: () => <MyListToggleButton />, // Botón a la derecha
          headerBackVisible: false, 
        }}
      />
      <Stack.Screen 
        name="[id]"  // -> /app/(tabs)/characters/[id].tsx (CharactersScreen)
        options={{ 
          title: 'Personajes',
          // Opcional: Si quieres el botón también aquí, aunque podría no tener sentido
          // headerRight: () => <MyListToggleButton />, 
        }} 
      />
      {/* === NUEVA PANTALLA PARA MI LISTA === */}
      <Stack.Screen
        name="myList" // -> /app/(tabs)/characters/myList.tsx
        options={{
          title: 'Mi Lista de Animes',
          headerRight: () => <MyListToggleButton />, // Mismo botón, pero su lógica cambiará
          headerBackVisible: false, 
        }}
      />
    </Stack>
  );
}