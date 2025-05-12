// /app/(auth)/login.tsx
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, enterGuestMode } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor, ingresa email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      // Login successful! AuthProvider's onAuthStateChanged will update user state.
      // The root layout logic should automatically navigate to the main app.
      // We don't necessarily need router.replace() here if root layout handles it.
      console.log('Login successful');
    } catch (error: any) {
      console.error("Login error:", error);
      // Provide user-friendly error messages
      let errorMessage = 'Ocurrió un error al iniciar sesión.';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'El formato del email es inválido.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
         errorMessage = 'Email o contraseña incorrectos.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Intenta más tarde.';
      }
      Alert.alert('Error de Inicio de Sesión', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    setLoading(true); // Mostrar un feedback visual breve
    try {
      await enterGuestMode();
      // Después de entrar en modo invitado, InitialLayout debería permitir el acceso a /home
      // y como user es null pero isGuest es true, no debería redirigir de vuelta aquí.
      router.replace('/home'); // O la ruta principal de tu app, ej. '/characters'
    } catch (error) {
      console.error("Error entering guest mode:", error);
      Alert.alert("Error", "No se pudo continuar como invitado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Correo Electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.buttonPlaceholder} />
      ) : (
        <>
          <Pressable style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Entrar</Text>
          </Pressable>
          {/* --- BOTÓN CONTINUAR COMO INVITADO --- */}
          <Pressable style={[styles.button, styles.guestButton]} onPress={handleContinueAsGuest}>
            <Text style={styles.buttonText}>Continuar como Invitado</Text>
          </Pressable>
        </>
      )}

      <Link href="/(auth)/signup" asChild>
        <Pressable style={styles.linkButton} disabled={loading}>
          <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
        </Pressable>
      </Link>
    </View>
  );
}

// Add styles (similar styles can be reused for Signup)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    height: 50, // Match input height
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
  buttonPlaceholder: { // Estilo para el ActivityIndicator cuando reemplaza botones
    height: 110, // Aproximadamente la altura de dos botones + margen
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  guestButton: {
    backgroundColor: '#555', // Un color diferente para el botón de invitado
    marginTop: 10, // Espacio entre botones si no está loading
  },
});