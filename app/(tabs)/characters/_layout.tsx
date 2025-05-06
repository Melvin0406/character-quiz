// _layout.tsx (o tu archivo de layout raíz)
import { Stack } from 'expo-router';
import { SelectionProvider } from '../../../context/SelectionContext';

export default function RootLayout() {
  return (
    <SelectionProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Lista de Animes' }} />
        <Stack.Screen name="[id]" options={{ title: 'Personajes' }} />
        {/* Agrega otras pantallas aquí si es necesario */}
      </Stack>
    </SelectionProvider>
  );
}