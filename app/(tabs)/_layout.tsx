// app/(tabs)/_layout.tsx
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';

// Función auxiliar para el icono (puedes definirla aquí o importarla)
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'blue', // Elige tu color activo
        headerShown: false, // Descomentar para que cada stack maneje su propio header
      }}>
      <Tabs.Screen
        name="home" // Asumo que tienes una pestaña home
        options={{
          title: 'Inicio',
          headerShown: false, // Para que el layout de home maneje su header
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="characters" // Pestaña de personajes/animes
        options={{
          title: 'Animes',
          headerShown: false, // Para que el layout de characters maneje su header
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="games" // Este nombre debe coincidir con el nombre de la carpeta /app/(tabs)/games/
        options={{
          title: 'Juegos',
          headerShown: false, // Dejamos que el Stack dentro de "games" maneje su propio header
          tabBarIcon: ({ color }) => <TabBarIcon name="gamepad" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings" // Este nombre debe coincidir con la carpeta /app/(tabs)/settings/
        options={{
          title: 'Ajustes',
          headerShown: false, // Dejamos que el Stack dentro de "settings" maneje su propio header
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}

