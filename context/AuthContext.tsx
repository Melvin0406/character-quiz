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
  signOut
} from '@react-native-firebase/auth';
import { doc, FirebaseFirestoreTypes, getDoc, getFirestore, serverTimestamp, setDoc, updateDoc } from '@react-native-firebase/firestore';

const rnfbAuth = getAuth(); 
const db = getFirestore(); // Obtener instancia de Firestore
const GUEST_MODE_KEY = '@Auth:isGuest';

// Interfaz para el perfil del usuario en Firestore
export interface UserProfile {
  uid: string;
  email: string | null;
  username: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

interface AuthContextType {
  user: FirebaseAuthTypes.User | null; // PASO 2: Usar FirebaseAuthTypes.User
  userProfile: UserProfile | null; // Para username y otros datos
  isGuest: boolean;
  initializing: boolean; // Para el estado inicial de Firebase Auth y carga de isGuest
  authLoading: boolean;  // Para operaciones específicas de login, signup, etc.
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, username: string) => Promise<void>; // username añadido
  logout: () => Promise<void>;
  enterGuestMode: () => Promise<void>;
  updateUsername: (newUsername: string) => Promise<void>; // Nueva función
  refreshUserProfile: () => Promise<void>; // Nueva función
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [initializing, setInitializing] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null); // PASO 2: Usar FirebaseAuthTypes.User
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const fetchUserProfile = async (firebaseUser: FirebaseAuthTypes.User | null): Promise<UserProfile | null> => {
    if (!firebaseUser) return null;
    console.log(`AuthContext: Fetching profile for UID: ${firebaseUser.uid}`);
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid); // Modular
      const userDocSnap = await getDoc(userDocRef); // Modular
      if (userDocSnap.exists()) {
        console.log(`AuthContext: Profile found for UID: ${firebaseUser.uid}`);
        return userDocSnap.data() as UserProfile;
      } else {
        console.warn(`AuthContext: No profile document found in Firestore for user ${firebaseUser.uid}.`);
      }
    } catch (error) {
      console.error("AuthContext: Error fetching user profile from Firestore:", error);
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;
    console.log("AuthContext: Setting up onAuthStateChanged listener.");

    const subscriber = onAuthStateChanged(rnfbAuth, async (userState) => {
      if (!isMounted) return;
      console.log('AuthContext: onAuthStateChanged triggered. User state UID:', userState?.uid || null);
      setUser(userState);

      if (userState) {
        console.log('AuthContext: User detected by onAuthStateChanged. Fetching/Refreshing profile...');
        setAuthLoading(true); // Indicar carga de perfil
        const profile = await fetchUserProfile(userState);
        if (isMounted) {
          setUserProfile(profile);
          setIsGuest(false); 
          await AsyncStorage.setItem(GUEST_MODE_KEY, 'false');
          console.log('AuthContext: User state processed, profile set from fetch:', profile);
          setAuthLoading(false);
        }
      } else {
        console.log('AuthContext: No user detected. Clearing profile.');
        if (isMounted) {
          setUserProfile(null);
          // Cargar estado de invitado solo si no hay usuario
          const guestStatusString = await AsyncStorage.getItem(GUEST_MODE_KEY);
          setIsGuest(guestStatusString === 'true');
        }
      }
      if (isMounted && initializing) {
        setInitializing(false);
        console.log('AuthContext: Firebase Auth initialization complete.');
      }
    });
    return () => { 
        console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
        isMounted = false;
        subscriber(); // Desuscribirse
    };
  }, []); // Vacío para que solo se ejecute una vez al montar AuthProvider

  const login = async (email: string, pass: string) => {
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(rnfbAuth, email, pass);
      // onAuthStateChanged manejará setUser, fetchUserProfile, y setInitializing si es necesario.
      // setIsGuest(false) y AsyncStorage se manejan en onAuthStateChanged cuando userState es true.
      console.log('AuthContext: Login call successful.');
    } catch (error: any) { 
      console.error('AuthContext: Login failed:', error); 
      throw error; 
    } finally { 
      setAuthLoading(false); 
    }
  };

  const signup = async (email: string, pass: string, username: string) => {
    setAuthLoading(true);
    try {
      if (!username.trim()) {
        throw { code: 'auth/invalid-username', message: 'El nombre de usuario no puede estar vacío.' };
      }
      const userCredential = await createUserWithEmailAndPassword(rnfbAuth, email, pass);
      if (userCredential.user) {
        const firebaseUser = userCredential.user;
        const newUserProfileData: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          username: username.trim(),
          createdAt: serverTimestamp() as FirebaseFirestoreTypes.Timestamp, // Modular
        };
        const userDocRef = doc(db, 'users', firebaseUser.uid); // Modular
        await setDoc(userDocRef, newUserProfileData); // Modular - Crea el documento de perfil

        setUser(firebaseUser); // Actualizar el usuario de Auth
        setUserProfile(newUserProfileData); // <<-- Actualizar el perfil localmente AHORA
        setIsGuest(false); // Asegurar que no sea invitado
        await AsyncStorage.setItem(GUEST_MODE_KEY, 'false');

        console.log('AuthContext: Signup successful, profile created in Firestore and set in context.');
        
      } else {
        throw new Error("No se pudo crear el usuario en Firebase Auth.");
      }
    } catch (error: any) { console.error('AuthContext: Signup failed:', error); throw error; 
    } finally { setAuthLoading(false); }
  };

  const logout = async () => {
    setAuthLoading(true);
    try {
      await signOut(rnfbAuth);
      // onAuthStateChanged manejará setUser(null) y setUserProfile(null).
      setIsGuest(false); // Forzar salida de modo invitado
      await AsyncStorage.setItem(GUEST_MODE_KEY, 'false');
      console.log('AuthContext: Logout successful, guest mode definitively exited.');
    } catch (error: any) { console.error('AuthContext: Logout failed:', error); throw error; 
    } finally { setAuthLoading(false); }
  };

  const enterGuestMode = async () => {
    setAuthLoading(true);
    if (user) { // Si ya hay un usuario logueado, no puede entrar en modo invitado.
      console.log('AuthContext: User already logged in, cannot enter guest mode.');
      setAuthLoading(false);
      return; 
    }
    setUser(null); // Asegurar que no haya usuario de Firebase Auth
    setUserProfile(null); // Limpiar cualquier perfil
    setIsGuest(true);
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    if (initializing) { // Si esto se llama mientras aún se inicializaba, forzar fin de inicialización
        setInitializing(false);
    }
    console.log('AuthContext: Entered guest mode.');
    setAuthLoading(false);
  };

  const updateUsername = async (newUsername: string) => {
    if (!user || !user.uid) { /* ... */ throw new Error("Debes iniciar sesión..."); }
    if (!newUsername.trim()) { throw { /* ... */ message: 'El nombre no puede estar vacío.' }; }
    setAuthLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid); // Modular
      await updateDoc(userDocRef, { username: newUsername.trim() }); // Modular
      // Actualizar el perfil local inmediatamente
      setUserProfile(prevProfile => prevProfile ? { ...prevProfile, username: newUsername.trim() } : null);
      console.log('AuthContext: Username updated successfully in Firestore.');
    } catch (error: any) { /* ... */ throw error; 
    } finally { setAuthLoading(false); }
  };

  const refreshUserProfile = async () => {
      if (user) {
          console.log("AuthContext: Attempting to refresh user profile...");
          setAuthLoading(true);
          const profile = await fetchUserProfile(user);
          setUserProfile(profile);
          setAuthLoading(false);
          console.log("AuthContext: User profile refresh complete.", profile);
      } else {
          console.log("AuthContext: No user to refresh profile for.");
      }
  };

  if (initializing) {
    return ( <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#007AFF"/></View> );
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        userProfile,
        isGuest, 
        initializing,
        authLoading,
        login,
        signup,
        logout,
        enterGuestMode,
        updateUsername,
        refreshUserProfile
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