// app/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="characters" options={{ title: 'Personajes' }} />
      <Tabs.Screen name="games" options={{ title: 'Juegos' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}

