// context/AuthContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

// PASO 1: Importar funciones modulares Y el namespace de tipos
import type { FirebaseAuthTypes } from '@react-native-firebase/auth'; // <-- Importar el namespace de tipos así
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from '@react-native-firebase/auth';

const rnfbAuth = getAuth(); 
const GUEST_MODE_KEY = '@Auth:isGuest';

interface AuthContextType {
  user: FirebaseAuthTypes.User | null; // PASO 2: Usar FirebaseAuthTypes.User
  isGuest: boolean;
  initializing: boolean; 
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  enterGuestMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null); // PASO 2: Usar FirebaseAuthTypes.User
  const [isGuest, setIsGuest] = useState(false);

  function handleAuthStateChanged(userState: FirebaseAuthTypes.User | null) { // PASO 2: Usar FirebaseAuthTypes.User
    setUser(userState);
    if (initializing) {
      setInitializing(false);
    }
    console.log('Auth State Changed (Modular), User:', userState?.uid || null); 
  }

  useEffect(() => {
    const subscriber = onAuthStateChanged(rnfbAuth, handleAuthStateChanged);
    return subscriber; 
  }, []);

  // Cargar estado de invitado y observar cambios de auth
  useEffect(() => {
    let authSubscriber: (() => void) | undefined;
    
    const initializeAuth = async () => {
      try {
        // Cargar el estado de invitado persistido
        const guestStatusString = await AsyncStorage.getItem(GUEST_MODE_KEY);
        const persistedIsGuest = guestStatusString === 'true';
        setIsGuest(persistedIsGuest);
        console.log('AuthContext: Guest status loaded from AsyncStorage:', persistedIsGuest);

        // Suscribirse a cambios de estado de autenticación de Firebase
        authSubscriber = onAuthStateChanged(rnfbAuth, (userState) => {
          setUser(userState);
          console.log('AuthContext: Auth State Changed, User:', userState?.uid || null);
          if (userState) { // Si hay un usuario logueado, no puede ser invitado
            setIsGuest(false); 
            AsyncStorage.setItem(GUEST_MODE_KEY, 'false'); // Asegurar que no quede como invitado
          }
          if (initializing) {
            setInitializing(false);
          }
        });
      } catch (e) {
        console.error("AuthContext: Error during initialization", e);
        setInitializing(false); // Asegurar que la inicialización termine incluso con error
      }
    };

    initializeAuth();

    return () => {
      if (authSubscriber) authSubscriber(); // Desuscribirse al desmontar
    };
  }, [initializing]);

  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(rnfbAuth, email, pass);
    } catch (error: any) {
      console.error('Login failed (Modular):', error);
      throw error; 
    }
  };

  const signup = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(rnfbAuth, email, pass);
    } catch (error: any) {
      console.error('Signup failed (Modular):', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(rnfbAuth);
    } catch (error: any) {
      console.error('Logout failed (Modular):', error);
      throw error;
    }
  };

  const enterGuestMode = async () => {
    if (user) { // No debería pasar si ya está logueado, pero por si acaso
        console.log('AuthContext: User already logged in, cannot enter guest mode.');
        return;
    }
    setIsGuest(true);
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    console.log('AuthContext: Entered guest mode.');
    // No necesitamos cambiar 'user' aquí, ya es null
    // Si 'initializing' es true, el listener onAuthStateChanged lo pondrá a false.
    // Si ya era false, no hay problema.
    if (initializing) setInitializing(false); // Asegurar que la app proceda si estaba esperando
  };

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF"/>
      </View>
    );
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isGuest,
        initializing, 
        login,
        signup,
        logout,
        enterGuestMode 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});