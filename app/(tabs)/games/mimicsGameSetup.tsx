// /app/(tabs)/games/mimicsGameSetup.tsx
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react'; // Añadir useEffect
import { ActivityIndicator, Alert, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'; // Añadir ActivityIndicator
// Importar desde el contexto
import { BasicCharacterInfo, CachedAnimeInfo, useSelection } from '../../../context/SelectionContext';

interface Participant {
  id: string;
  name: string;
}

// Esta será la estructura de los personajes que pasaremos al juego
interface GameCharacter {
  mal_id: number;
  name: string;
  image_url?: string;
  anime_title: string; // Para mostrar de qué anime es
}

const MIN_CHARACTERS_TO_PLAY = 3; // Define un mínimo de personajes para jugar
const DEFAULT_TIME_PER_ROUND = "90"; // Segundos
const DEFAULT_NUMBER_OF_ROUNDS = "3"; // 0 o vacío para ilimitado

export default function MimicsGameSetupScreen() {
  const router = useRouter();
  const { selectedCharacterIds, cachedAnimesData, isLoading: isSelectionContextLoading } = useSelection();
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentName, setCurrentName] = useState('');
  const [characterListForGame, setCharacterListForGame] = useState<GameCharacter[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [numberOfRoundsInput, setNumberOfRoundsInput] = useState<string>(DEFAULT_NUMBER_OF_ROUNDS); // 0 o vacío para ilimitadas
  const [timePerRoundInput, setTimePerRoundInput] = useState<string>(DEFAULT_TIME_PER_ROUND); // en segundos

  useEffect(() => {
    if (!isSelectionContextLoading) {
      setIsLoadingCharacters(true);
      const gameChars: GameCharacter[] = [];
      if (selectedCharacterIds.size > 0 && Object.keys(cachedAnimesData).length > 0) {
        // Iterar sobre los animes cacheados
        for (const animeIdStr in cachedAnimesData) {
          const animeInfo: CachedAnimeInfo = cachedAnimesData[animeIdStr];
          if (animeInfo.characters && animeInfo.characters.length > 0) {
            animeInfo.characters.forEach((char: BasicCharacterInfo) => {
              // Si el ID del personaje está en la lista de seleccionados globalmente
              if (selectedCharacterIds.has(char.mal_id)) {
                // Evitar duplicados si el mismo mal_id ya fue añadido (aunque no debería pasar con Set)
                if (!gameChars.find(gc => gc.mal_id === char.mal_id)) {
                    gameChars.push({
                        mal_id: char.mal_id,
                        name: char.name,
                        image_url: char.image_url,
                        anime_title: animeInfo.title, // Título del anime al que pertenece en la caché
                    });
                }
              }
            });
          }
        }
      }
      setCharacterListForGame(gameChars);
      setIsLoadingCharacters(false);
    }
  }, [selectedCharacterIds, cachedAnimesData, isSelectionContextLoading]);

  const addParticipant = () => {
    if (currentName.trim()) {
      if (participants.find(p => p.name.toLowerCase() === currentName.trim().toLowerCase())) {
        Alert.alert("Nombre Duplicado", "Este nombre ya ha sido añadido.");
        return;
      }
      setParticipants(prev => [...prev, { id: String(Date.now()), name: currentName.trim() }]);
      setCurrentName('');
      Keyboard.dismiss();
    } else {
      Alert.alert("Nombre Vacío", "Por favor, introduce un nombre.");
    }
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const startGame = () => {
    if (participants.length < 2) {
      Alert.alert('Muy Pocos Jugadores', 'Se necesitan al menos 2 participantes para jugar.');
      return;
    }

    if (characterListForGame.length < MIN_CHARACTERS_TO_PLAY) {
      Alert.alert(
        'Pocos Personajes', 
        `Necesitas al menos ${MIN_CHARACTERS_TO_PLAY} personajes diferentes en tu lista personal para una buena experiencia. Actualmente tienes ${characterListForGame.length}.`
      );
      return;
    }

    // Validar y parsear configuraciones del juego
    const parsedRounds = parseInt(numberOfRoundsInput, 10);
    const finalNumberOfRounds = !isNaN(parsedRounds) && parsedRounds > 0 ? parsedRounds : 0; // 0 para ilimitado

    const parsedTime = parseInt(timePerRoundInput, 10);
    const finalTimePerRound = !isNaN(parsedTime) && parsedTime >= 30 ? parsedTime : parseInt(DEFAULT_TIME_PER_ROUND, 10); // Mínimo 30s

    if (isNaN(parsedTime) || parsedTime < 30) {
        Alert.alert("Tiempo Inválido", `El tiempo por ronda debe ser de al menos 30 segundos. Se usará el valor por defecto (${DEFAULT_TIME_PER_ROUND}s).`);
    }

    const gameParticipants = participants.map(p => ({ name: p.name, score: 0 }));

    router.push({
      pathname: '/games/mimicsGame',
      params: {
        participants: JSON.stringify(gameParticipants),
        characterList: JSON.stringify(characterListForGame),
        numberOfRounds: String(finalNumberOfRounds), // Convertir a string para params
        timePerRound: String(finalTimePerRound),   // Convertir a string para params
      },
    });
  };

  if (isSelectionContextLoading || isLoadingCharacters) {
    return (
        <View style={styles.centeredLoader}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Cargando personajes seleccionados...</Text>
        </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Añadir Participantes:</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nombre del Participante"
          value={currentName}
          onChangeText={setCurrentName}
          onSubmitEditing={addParticipant}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={addParticipant}>
            <Text style={styles.addButtonText}>Añadir</Text>
        </Pressable>
      </View>

      <FlatList
        data={participants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.participantItem}>
            <Text style={styles.participantName}>{item.name}</Text>
            <Pressable onPress={() => removeParticipant(item.id)} style={styles.removeButton}>
              <FontAwesome name="trash" size={20} color="white" />
            </Pressable>
          </View>
        )}
        ListHeaderComponent={participants.length > 0 ? <Text style={styles.listHeader}>Jugadores:</Text> : null}
        ListEmptyComponent={<Text style={styles.emptyListText}>Aún no hay participantes.</Text>}
        style={styles.list}
      />

      <Text style={styles.label}>Configuración del Juego:</Text>
      <View style={styles.configItem}>
        <Text style={styles.configLabel}>Número de Rondas (0 para ilimitado):</Text>
        <TextInput
          style={styles.configInput}
          value={numberOfRoundsInput}
          onChangeText={setNumberOfRoundsInput}
          placeholder={DEFAULT_NUMBER_OF_ROUNDS}
          keyboardType="number-pad"
          returnKeyType="done"
        />
      </View>
      <View style={styles.configItem}>
        <Text style={styles.configLabel}>Tiempo por Ronda (segundos, mín. 30):</Text>
        <TextInput
          style={styles.configInput}
          value={timePerRoundInput}
          onChangeText={setTimePerRoundInput}
          placeholder={DEFAULT_TIME_PER_ROUND}
          keyboardType="number-pad"
          returnKeyType="done"
        />
      </View>
      
      <View style={styles.infoBox}>
        {/* Icono */}
        <FontAwesome name="info-circle" size={20} color="#007AFF" style={styles.infoIcon}/> 
        
        {/* Contenedor para los textos que ocupará el espacio restante */}
        <View style={styles.infoTextContainer}> 
          {/* Primer texto (ya NO usa flex: 1 directamente) */}
          <Text style={styles.infoTextBase}>
            Se usarán los <Text style={styles.infoTextBold}>{characterListForGame.length}</Text> personajes de tu lista personal.
          </Text>
          
          {/* Segundo texto (condicional, tampoco usa flex: 1) */}
          {characterListForGame.length < MIN_CHARACTERS_TO_PLAY && (
            <Text style={[styles.infoTextBase, styles.infoTextWarning]}>
              (Necesitas al menos {MIN_CHARACTERS_TO_PLAY} para jugar)
            </Text>
          )}
        </View>
      </View>

      <Pressable 
        style={[
            styles.startButton, 
            (participants.length < 2 || characterListForGame.length < MIN_CHARACTERS_TO_PLAY) && styles.startButtonDisabled
        ]} 
        onPress={startGame} 
        disabled={participants.length < 2 || characterListForGame.length < MIN_CHARACTERS_TO_PLAY}
      >
        <Text style={styles.startButtonText}>Iniciar Juego</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    // flex: 1, // Quitar si se usa ScrollView para el container principal
    padding: 20,
    // backgroundColor: '#fff', // Mover a scrollView si es necesario
  },
  configItem: {
    marginBottom: 15,
  },
  configLabel: {
    fontSize: 16,
    color: '#444',
    marginBottom: 5,
  },
  configInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    borderRadius: 8,
  },
  centeredLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    marginBottom: 20,
    maxHeight: 200, // Para evitar que la lista ocupe toda la pantalla
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginBottom: 8,
  },
  participantName: {
    fontSize: 17,
    color: '#333',
  },
  removeButton: {
    padding: 8,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 15,
    marginTop: 10,
  },
  infoBox: {
    flexDirection: 'row',       // Icono al lado del texto
    backgroundColor: '#e7f3ff', // Fondo azul claro
    padding: 15,
    borderRadius: 8,
    marginBottom: 25,
    alignItems: 'flex-start',   // Alinear icono arriba con el texto
    },
  infoIcon: {
    marginRight: 10,         // Espacio entre icono y texto
    marginTop: 2,            // Ajuste vertical fino del icono
  },
  infoTextContainer: {
    flex: 1,                 // Este View ocupa el espacio restante en la fila
    // Por defecto tiene flexDirection: 'column', que está bien aquí
  },
  // Estilo base para ambos textos dentro del infoBox
  infoTextBase: { 
    fontSize: 14,
    color: '#0052cc',        // Color azul oscuro para el texto principal
    lineHeight: 20,
    // Quitado: flex: 1 
  },
  // Estilo solo para la parte en negrita
  infoTextBold: {
    fontWeight: 'bold',
  },
  // Estilo para el texto de advertencia
  infoTextWarning: {
    color: 'red',             // Color rojo para advertencia
    marginTop: 5,             // Espacio arriba si aparece
  },
  infoText: {
    flex: 1, // Permite que el texto haga wrap
    fontSize: 14,
    color: '#0052cc',
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});