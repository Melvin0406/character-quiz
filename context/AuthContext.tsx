// context/AuthContext.tsx
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

interface AuthContextType {
  user: FirebaseAuthTypes.User | null; // PASO 2: Usar FirebaseAuthTypes.User
  initializing: boolean; 
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null); // PASO 2: Usar FirebaseAuthTypes.User

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
        initializing, 
        login,
        signup,
        logout 
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