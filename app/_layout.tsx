// /app/_layout.tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native'; // Para el loader de InitialLayout
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SelectionProvider } from '../context/SelectionContext';

const InitialLayout = () => {
  const { user, initializing, isGuest } = useAuth(); // <--- Obtener isGuest
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Esperar a que tanto Firebase Auth como el estado isGuest (cargado de AsyncStorage) se inicialicen.
    // 'initializing' del AuthContext ya cubre la carga de isGuest porque lo pusimos en el mismo useEffect.
    if (initializing) {
      console.log("InitialLayout: Auth initializing, waiting...");
      return; 
    }

    const inAuthGroup = segments[0] === '(auth)';
    console.log(`InitialLayout: Check - User: ${user?.uid}, Guest: ${isGuest}, InAuth: ${inAuthGroup}, Segments: ${segments.join('/')}`);

    if (user) { // Usuario LOGUEADO
      if (inAuthGroup) {
        console.log("InitialLayout: User logged in but in auth flow, redirecting to /home");
        router.replace('/home'); 
      } else {
        console.log("InitialLayout: User logged in, staying in main app flow.");
        // No hacer nada, ya está en el flujo correcto
      }
    } else { // Usuario NO LOGUEADO (user === null)
      if (isGuest) { // Y HA ELEGIDO SER INVITADO
        if (inAuthGroup) {
          // Es un invitado, pero intentó ir a /login o /signup.
          // Lo ideal sería que si un invitado quiere loguearse, pueda.
          // Pero si accidentalmente llega aquí (ej. por URL directa y no hay user), lo mandamos a home.
          // O, si queremos que pueda ver login/signup para salir de invitado, no hacemos nada aquí.
          // Por ahora, si es invitado y está en (auth), lo mandamos a home.
          console.log("InitialLayout: Guest is in auth group, redirecting to /home as guest."); 
        } else {
          console.log("InitialLayout: User is guest, staying in main app flow.");
          // No hacer nada, ya está en el flujo correcto como invitado
        }
      } else { // NO LOGUEADO y NO HA ELEGIDO SER INVITADO
        if (!inAuthGroup) {
          console.log("InitialLayout: User not logged in, not guest, and not in auth flow. Redirecting to login.");
          router.replace('/(auth)/login');
        } else {
          console.log("InitialLayout: User not logged in, not guest, but in auth flow. Staying.");
          // No hacer nada, ya está en (auth)/login o (auth)/signup
        }
      }
    }
  }, [user, initializing, isGuest, segments, router]);

  // Si aún está inicializando (AuthProvider ya muestra un loader, pero por si acaso)
  if (initializing) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />; // Renderiza la pantalla actual (login, home, etc.)
}

export default function RootLayout() {
  console.log("Rendering RootLayout with AuthProvider > SelectionProvider"); 
  return (
    <AuthProvider>
      <SelectionProvider>
        <InitialLayout /> 
      </SelectionProvider>
    </AuthProvider>
  );
}