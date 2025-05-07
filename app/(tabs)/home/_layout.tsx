// app/(tabs)/home/_layout.tsx
import { Stack } from 'expo-router';

export default function HomeStackLayout() {
  return (
      <Stack
      // Configurar opciones globales para este Stack
      // screenOptions={{
      //   headerStyle: { backgroundColor: '#f4511e' },
      //   headerTintColor: '#fff',
      // }}
      >
        <Stack.Screen
          name="index" // Corresponde a /app/(tabs)/home/index.tsx
          options={{ title: 'Bienvenido a OtaQuiz' }}
        />
      </Stack>
    );
}