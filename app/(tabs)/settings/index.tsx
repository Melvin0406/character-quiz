// /app/(tabs)/settings/index.tsx
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../../context/AuthContext'; // Ajusta la ruta a tu AuthContext

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isGuest, logout, enterGuestMode } = useAuth(); // enterGuestMode podría no ser necesario aquí

  const handleLogout = async () => {
    try {
      await logout();
      // La navegación a /login será manejada por InitialLayout en app/_layout.tsx
      // después de que el estado 'user' se actualice a null.
      // Podrías añadir un router.replace('/(auth)/login'); si quieres forzarlo inmediatamente,
      // pero es mejor dejar que el sistema de estado lo maneje.
      Alert.alert("Sesión Cerrada", "Has cerrado sesión correctamente.");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      Alert.alert("Error", "No se pudo cerrar la sesión.");
    }
  };

  const handleGoToLogin = () => {
    // Si el usuario es invitado y quiere loguearse, lo llevamos a login.
    // El AuthContext (logout o login) ya maneja el estado isGuest.
    router.push('/(auth)/login');
  };

  const handleGoToSignup = () => {
    router.push('/(auth)/signup');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajustes</Text>

      {user && ( // Opciones para usuario LOGUEADO
        <View style={styles.section}>
          <Text style={styles.userInfo}>Conectado como: {user.email || user.uid}</Text>
          <Pressable style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
            <Text style={styles.buttonText}>Cerrar Sesión</Text>
          </Pressable>
        </View>
      )}

      {isGuest && !user && ( // Opciones para usuario INVITADO
        <View style={styles.section}>
          <Text style={styles.guestInfo}>Estás navegando como invitado.</Text>
          <Pressable style={[styles.button, styles.loginButton]} onPress={handleGoToLogin}>
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.signupButton]} onPress={handleGoToSignup}>
            <Text style={styles.buttonText}>Crear Cuenta</Text>
          </Pressable>
        </View>
      )}

      {!user && !isGuest && ( // Caso fallback: No logueado y no explícitamente invitado (debería estar en login)
        <View style={styles.section}>
            <Text style={styles.guestInfo}>No has iniciado sesión.</Text>
            <Pressable style={[styles.button, styles.loginButton]} onPress={handleGoToLogin}>
                <Text style={styles.buttonText}>Ir a Inicio de Sesión</Text>
            </Pressable>
        </View>
      )}

      {/* Aquí podrías añadir más opciones de ajustes en el futuro */}
      {/* Ejemplo:
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferencias</Text>
        // Opciones de tema, notificaciones, etc.
      </View>
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: { // Para futuras secciones
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#444',
  },
  userInfo: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#555',
  },
  guestInfo: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#555',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12, // Espacio entre botones
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF3B30', // Rojo
  },
  loginButton: {
    backgroundColor: '#007AFF', // Azul
  },
  signupButton: {
    backgroundColor: '#34C759', // Verde
  },
});