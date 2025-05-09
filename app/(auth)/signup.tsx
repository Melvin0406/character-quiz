// /app/(auth)/signup.tsx
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Adjust path

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth(); // Get signup function
  const router = useRouter();

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Por favor, completa todos los campos.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
       Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
       return;
    }

    setLoading(true);
    try {
      await signup(email, password);
      // Signup successful! AuthProvider's onAuthStateChanged will update user state.
      // Root layout logic should navigate to the main app.
      console.log('Signup successful');
    } catch (error: any) {
      console.error("Signup error:", error);
      let errorMessage = 'Ocurrió un error al registrar la cuenta.';
       if (error.code === 'auth/invalid-email') {
        errorMessage = 'El formato del email es inválido.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo electrónico ya está registrado.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil.';
      }
      Alert.alert('Error de Registro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear Cuenta</Text>
      
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
        placeholder="Contraseña (mín. 6 caracteres)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmar Contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.button} />
      ) : (
        <Pressable style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Registrarse</Text>
        </Pressable>
      )}

      <Link href="/(auth)/login" asChild>
        <Pressable style={styles.linkButton}>
          <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
        </Pressable>
      </Link>
    </View>
  );
}

// Re-use or adapt styles from LoginScreen
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
    height: 50, 
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
});