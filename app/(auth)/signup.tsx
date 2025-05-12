// /app/(auth)/signup.tsx
import { Link } from 'expo-router'; // No necesitas useRouter aquí si no navegas explícitamente DESPUÉS del signup
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Ajusta la ruta

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState(''); // <--- NUEVO ESTADO
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signup, authLoading } = useAuth(); // <--- Obtener signup y authLoading

  const handleSignup = async () => {
    if (!email || !username.trim() || !password || !confirmPassword) { // <--- VALIDAR USERNAME
      Alert.alert('Campos Incompletos', 'Por favor, completa todos los campos.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error de Contraseña', 'Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
       Alert.alert('Contraseña Débil', 'La contraseña debe tener al menos 6 caracteres.');
       return;
    }
    // Podrías añadir más validaciones para el username (ej. longitud)

    try {
      await signup(email.trim(), password, username.trim()); // <--- PASAR USERNAME
      // Si el signup es exitoso, onAuthStateChanged en AuthContext actualizará el estado 'user'
      // y el componente InitialLayout en app/_layout.tsx se encargará de la redirección.
      console.log('SignupScreen: Signup call successful.');
    } catch (error: any) {
      console.error("SignupScreen: Signup error:", error);
      let errorMessage = error.message || 'Ocurrió un error al registrar la cuenta.';
       if (error.code === 'auth/invalid-email') {
        errorMessage = 'El formato del email es inválido.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo electrónico ya está registrado.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil.';
      } else if (error.code === 'auth/invalid-username') { // Usar mensaje del AuthContext
        errorMessage = error.message; 
      }
      Alert.alert('Error de Registro', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear Cuenta</Text>
      
      {/* --- NUEVO INPUT PARA USERNAME --- */}
      <TextInput
        style={styles.input}
        placeholder="Nombre de Usuario"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none" // Común para usernames
        returnKeyType="next"
      />
      <TextInput style={styles.input} placeholder="Correo Electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" returnKeyType="next"/>
      <TextInput style={styles.input} placeholder="Contraseña (mín. 6 caracteres)" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="next"/>
      <TextInput style={styles.input} placeholder="Confirmar Contraseña" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry returnKeyType="done" onSubmitEditing={handleSignup}/>

      {authLoading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.buttonPlaceholder} />
      ) : (
        <Pressable style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Registrarse</Text>
        </Pressable>
      )}

      <Link href="/(auth)/login" asChild>
        <Pressable style={styles.linkButton} disabled={authLoading}>
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
  buttonPlaceholder: { height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 10, },
});