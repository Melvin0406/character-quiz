// /app/(tabs)/games/index.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export default function GamesListScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  const handleGameSelect = (gamePath: string) => {
    // Guardamos la ruta del juego para usarla después de la selección de modo
    // Por ahora, solo tenemos un juego, así que el modal siempre es para mimicsGameSetup
    setModalVisible(true);
  };

  const handleDeviceModeSelect = (mode: 'single' | 'multi') => {
    setModalVisible(false);
    if (mode === 'single') {
      // Navegar a la configuración del juego de mímica
      router.push('/games/mimicsGameSetup');
    } else {
      alert('Multijugador en múltiples dispositivos aún no implementado.');
      // En el futuro, aquí podrías navegar a una pantalla de lobby o similar.
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Juegos Disponibles</Text>

      <Pressable style={styles.gameItem} onPress={() => handleGameSelect('mimicsGameSetup')}>
        <Text style={styles.gameTitle}>Mímica de Personajes</Text>
        <Text style={styles.gameDescription}>¡Actúa y que tus amigos adivinen el personaje de anime!</Text>
      </Pressable>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>¿Cómo quieres jugar?</Text>
            <View style={styles.buttonContainer}>
              <Pressable
                style={[styles.button, styles.buttonOption]}
                onPress={() => handleDeviceModeSelect('single')}>
                <Text style={styles.textStyle}>Un Dispositivo</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonOption, styles.buttonDisabled]}
                onPress={() => handleDeviceModeSelect('multi')}
                disabled={true} // Habilitar en el futuro
              >
                <Text style={styles.textStyle}>Múltiples Dispositivos</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={() => setModalVisible(!modalVisible)}>
              <Text style={styles.textStyle}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f4f8', // Un color de fondo suave
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    color: '#333',
  },
  gameItem: {
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 15,
    // Sombras sutiles
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF', // Un color azul para el título del juego
  },
  gameDescription: {
    fontSize: 15,
    color: '#555',
    marginTop: 8,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // Un poco más oscuro para el overlay
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%', // Un poco más ancho
  },
  modalText: {
    marginBottom: 25,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 15,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    elevation: 2,
    width: '100%',
    marginBottom: 12,
  },
  buttonOption: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    backgroundColor: '#a0cfff', // Un azul más claro para deshabilitado
    opacity: 0.7,
  },
  buttonClose: {
    backgroundColor: '#FF3B30', // Rojo para cancelar/cerrar
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});