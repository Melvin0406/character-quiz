// context/AuthContext.tsx
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native'; // Import loading indicator

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean; 
  // Add functions
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  function onAuthStateChanged(userState: FirebaseAuthTypes.User | null) {
    setUser(userState);
    if (initializing) {
      setInitializing(false);
    }
    console.log('Auth State Changed, User:', userState?.uid || null); 
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; 
  }, []);

  // --- Authentication Functions ---
  const login = async (email: string, pass: string) => {
    try {
      await auth().signInWithEmailAndPassword(email, pass);
    } catch (error: any) {
      console.error('Login failed:', error);
      // Re-throw the error so UI can handle specific codes
      throw error; 
    }
  };

  const signup = async (email: string, pass: string) => {
    try {
      await auth().createUserWithEmailAndPassword(email, pass);
    } catch (error: any) {
      console.error('Signup failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await auth().signOut();
      // setUser(null) will be handled by onAuthStateChanged listener
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };
  // --- End Authentication Functions ---


  // Optionally show loading screen while Firebase initializes
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
        login, // Expose functions
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

// Add styles for loading container
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});