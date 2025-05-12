// /app/(tabs)/settings/index.tsx
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../../context/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, userProfile, isGuest, logout, updateUsername, authLoading, refreshUserProfile } = useAuth(); 

    const [newUsername, setNewUsername] = useState('');
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    
  // Efecto para asegurar que el perfil se cargue al entrar a la pantalla si es necesario
  useFocusEffect(
    useCallback(() => {
      if (user && !userProfile && !authLoading) { // Si hay usuario, no hay perfil cargado, y no estamos ya cargando algo
        console.log("SettingsScreen: User exists but no profile, calling refreshUserProfile.");
        refreshUserProfile();
      }
    }, [user, userProfile, authLoading, refreshUserProfile])
  );

  // Cuando userProfile cambie (ej. después de login o refresh) o cuando se empiece a editar,
  // popular el input con el username actual.
  useEffect(() => {
    if (userProfile) { // Quitar isEditingUsername de aquí para que siempre se actualice si el perfil cambia
      setNewUsername(userProfile.username || ''); // Usar || '' por si username es null/undefined
    } else if (!isEditingUsername) { // Si no hay perfil y no estamos editando, limpiar
        setNewUsername('');
    }
    // Si estamos editando, no queremos que el input se resetee por cambios en userProfile
    // hasta que se cancele o guarde.
  }, [userProfile]); // Solo depende de userProfile para precargar

  const handleLogout = async () => { /* ... (sin cambios) ... */ 
    try { await logout(); Alert.alert("Sesión Cerrada", "Has cerrado sesión correctamente."); } catch (error) { Alert.alert("Error", "No se pudo cerrar la sesión."); }
  };
  const handleGoToLogin = () => router.push('/(auth)/login');
  const handleGoToSignup = () => router.push('/(auth)/signup');

  const handleInitiateEditUsername = () => {
      setNewUsername(userProfile?.username || ''); // Precargar con el actual
      setIsEditingUsername(true);
  };

  const handleCancelEditUsername = () => {
      setIsEditingUsername(false);
      setNewUsername(userProfile?.username || ''); // Resetear al valor original
  };

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Nombre Inválido", "El nombre de usuario no puede estar vacío.");
      return;
    }
    if (newUsername.trim() === userProfile?.username) {
      setIsEditingUsername(false); // No hubo cambios
      return;
    }
    try {
      await updateUsername(newUsername.trim());
      Alert.alert("Éxito", "Nombre de usuario actualizado.");
      setIsEditingUsername(false);
      // Opcional: llamar a refreshUserProfile() aquí si quieres asegurar que todo el objeto userProfile se recargue
      // await refreshUserProfile(); // Si updateUsername no actualiza localmente todo lo necesario
    } catch (error: any) {
      Alert.alert("Error al Cambiar Nombre", error.message || "No se pudo actualizar el nombre de usuario.");
    }
    };
    
    // Mostrar un loader si estamos autenticando o cargando el perfil y aún no hay datos de perfil
  if (authLoading && !userProfile && user) {
    return (
        <View style={styles.centeredLoader}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
    );
}

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Ajustes</Text>

      {user && userProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <Text style={styles.userInfoLine}>Email: <Text style={styles.userInfoValue}>{user.email}</Text></Text>
          
          {!isEditingUsername ? (
            <View style={styles.fieldContainer}>
              <Text style={styles.userInfoLine}>
                Nombre de Usuario: <Text style={styles.userInfoValue}>{userProfile.username}</Text>
              </Text>
              <Pressable onPress={handleInitiateEditUsername} style={styles.editButtonSmall}>
                <Text style={styles.editButtonText}>Editar</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.editUsernameContainer}>
              <Text style={styles.inputLabel}>Nuevo Nombre de Usuario:</Text>
              <TextInput
                style={styles.input}
                value={newUsername}
                onChangeText={setNewUsername}
                placeholder="Nuevo nombre"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSaveUsername}
              />
              <View style={styles.editActions}>
                <Pressable 
                    style={[styles.buttonCore, styles.saveButton, authLoading && styles.disabledButton]} 
                    onPress={handleSaveUsername} 
                    disabled={authLoading}>
                  {authLoading ? <ActivityIndicator color="#fff" size="small"/> : <Text style={styles.buttonText}>Guardar</Text>}
                </Pressable>
                <Pressable 
                    style={[styles.buttonCore, styles.cancelButton, authLoading && styles.disabledButton]} 
                    onPress={handleCancelEditUsername} 
                    disabled={authLoading}>
                  <Text style={styles.buttonText}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          )}
          <View style={{marginTop: 20}}>
            <Pressable 
                style={[styles.buttonCore, styles.logoutButton, authLoading && styles.disabledButton]} 
                onPress={handleLogout} 
                disabled={authLoading}>
              {authLoading ? <ActivityIndicator color="#fff" size="small"/> : <Text style={styles.buttonText}>Cerrar Sesión</Text>}
            </Pressable>
          </View>
        </View>
      )}

      {isGuest && !user && ( // Opciones para usuario INVITADO
        <View style={styles.section}>
          <Text style={styles.guestInfo}>Estás navegando como invitado.</Text>
          <Pressable style={[styles.buttonCore, styles.loginButton]} onPress={handleGoToLogin}>
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          </Pressable>
          <Pressable style={[styles.buttonCore, styles.signupButton]} onPress={handleGoToSignup}>
            <Text style={styles.buttonText}>Crear Cuenta</Text>
          </Pressable>
        </View>
      )}

      {!user && !isGuest && ( // Caso fallback: No logueado y no explícitamente invitado (debería estar en login)
        <View style={styles.section}>
            <Text style={styles.guestInfo}>No has iniciado sesión.</Text>
            <Pressable style={[styles.buttonCore, styles.loginButton]} onPress={handleGoToLogin}>
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
    container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa', },
    pageTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#343a40', },
    section: { marginBottom: 25, padding: 20, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3, },
    sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 20, color: '#495057', borderBottomWidth: 1, borderBottomColor: '#e9ecef', paddingBottom: 10, },
    userInfoLine: { fontSize: 16, color: '#495057', marginBottom: 8, lineHeight: 24, },
    userInfoValue: { fontWeight: '600', color: '#212529' },
    fieldContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, },
    editButtonSmall: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#e9ecef', borderRadius: 6, },
    editButtonText: { color: '#007AFF', fontSize: 14, fontWeight: '500', },
    editUsernameContainer: { marginBottom: 20, },
    inputLabel: { fontSize: 14, color: '#495057', marginBottom: 6, },
    input: { height: 48, borderColor: '#ced4da', borderWidth: 1, marginBottom: 15, paddingHorizontal: 12, borderRadius: 6, fontSize: 16, backgroundColor: '#fff', },
    editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, }, // gap para separar botones
    guestInfo: { fontSize: 17, marginBottom: 10, textAlign: 'center', fontWeight: '500', color: '#343a40', },
    guestSubText: { fontSize: 15, color: '#6c757d', textAlign: 'center', marginBottom: 20, lineHeight: 22, },
    buttonCore: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', minHeight: 45, justifyContent: 'center', }, // Estilo base para botones
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', },
    logoutButton: { backgroundColor: '#dc3545', marginTop:10 },
    loginButton: { backgroundColor: '#007AFF', marginBottom:12, },
    signupButton: { backgroundColor: '#28a745', marginBottom:12, },
    saveButton: { backgroundColor: '#007AFF', paddingHorizontal: 20,},
    cancelButton: { backgroundColor: '#6c757d', paddingHorizontal: 20,},
    disabledButton: { opacity: 0.7, },
    centeredLoader: { // Nuevo estilo para el loader de perfil
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: { // Nuevo estilo
        marginTop: 10,
        fontSize: 16,
        color: '#555',
    },
});