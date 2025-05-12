// /app/(tabs)/games/mimicsGame.tsx
import FastImage from '@d11/react-native-fast-image';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// ... (interfaces GameParticipant, GameCharacter sin cambios) ...
interface GameParticipant {
  name: string;
  score: number;
}

interface GameCharacter {
  mal_id: number;
  name: string;
  image_url?: string;
  anime_title: string;
}


export default function MimicsGameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const navigation = useNavigation();

  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [characterListForGame, setCharacterListForGame] = useState<GameCharacter[]>([]); // Lista original de la sesión
  const [availableCharacters, setAvailableCharacters] = useState<GameCharacter[]>([]); // Personajes que aún no han salido
  
  const [currentActorIndex, setCurrentActorIndex] = useState(0);
  const [currentCharacter, setCurrentCharacter] = useState<GameCharacter | null>(null);
  const [timeLeft, setTimeLeft] = useState(90); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isCharacterRevealed, setIsCharacterRevealed] = useState(false);
  const [round, setRound] = useState(0); 
  // Añadimos 'gameOver' al gamePhase
  const [gamePhase, setGamePhase] = useState<'loading' | 'prepare' | 'acting' | 'scoring' | 'gameOver'>('loading');
  const [isScoringModalVisible, setIsScoringModalVisible] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState(''); // Para el mensaje de fin de juego

  // --- ESTADOS PARA CONFIGURACIÓN DEL JUEGO (recibidos de params) ---
  const [timePerRound, setTimePerRound] = useState(90); // Valor por defecto
  const [totalRounds, setTotalRounds] = useState(0); // 0 para ilimitado, valor por defecto

  // --- LÓGICA PARA OCULTAR/MOSTRAR LA BARRA DE PESTAÑAS ---
  useFocusEffect(
    useCallback(() => {
      // Intenta obtener el navegador padre (el de las pestañas)
      const parentNavigator = navigation.getParent();

      if (parentNavigator) {
        // Ocultar la barra de pestañas cuando esta pantalla está en foco
        parentNavigator.setOptions({
          tabBarStyle: { display: 'none' },
          // Si estás usando tabBarVisible (más antiguo):
          // tabBarVisible: false, 
        });
      }

      // Función de limpieza: se ejecuta cuando la pantalla pierde el foco
      return () => {
        if (parentNavigator) {
          // Restaurar la barra de pestañas cuando se sale de esta pantalla
          parentNavigator.setOptions({
            tabBarStyle: { display: 'flex' }, // O tu estilo por defecto, o undefined
            // Si usaste tabBarVisible:
            // tabBarVisible: true,
          });
        }
      };
    }, [navigation]) // La dependencia es navigation
  );
  // --- FIN DE LÓGICA PARA OCULTAR/MOSTRAR BARRA DE PESTAÑAS ---
  
  // Cargar participantes y lista de personajes
  useEffect(() => {
    let mounted = true;
    setGamePhase('loading');
    let parsedParticipants: GameParticipant[] = [];
    let parsedCharacterList: GameCharacter[] = [];
    let parsedNumberOfRounds = 0;
    let parsedTimePerRound = 90;

    // ... (lógica de parseo de params.participants sin cambios) ...
    if (params.participants) {
      try {
        parsedParticipants = JSON.parse(params.participants as string);
        if (!parsedParticipants || parsedParticipants.length < 2) {
          throw new Error("Datos de participantes inválidos o insuficientes.");
        }
      } catch (e) {
        console.error("Error parsing participants:", e);
        if (mounted) Alert.alert("Error", "No se pudo cargar la información de los participantes.", [{ text: "OK", onPress: () => router.replace('/games/mimicsGameSetup') }]);
        return;
      }
    } else {
      if (mounted) Alert.alert("Error", "No se recibieron datos de participantes.", [{ text: "OK", onPress: () => router.replace('/games/mimicsGameSetup') }]);
      return;
    }

    if (params.characterList) {
      try {
        parsedCharacterList = JSON.parse(params.characterList as string);
        if (!parsedCharacterList || parsedCharacterList.length === 0) {
          // Esta validación ya está en setup, pero por si acaso.
          throw new Error("Lista de personajes vacía.");
        }
      } catch (e) {
        console.error("Error parsing characterList:", e);
        if (mounted) Alert.alert("Error", "No se pudo cargar la lista de personajes.", [{ text: "OK", onPress: () => router.replace('/games/mimicsGameSetup') }]);
        return;
      }
    } else {
      if (mounted) Alert.alert("Error", "No se recibió la lista de personajes.", [{ text: "OK", onPress: () => router.replace('/games/mimicsGameSetup') }]);
      return;
    }

    // --- PARSEAR NUEVAS CONFIGURACIONES ---
    if (params.numberOfRounds) {
      parsedNumberOfRounds = parseInt(params.numberOfRounds as string, 10);
      if (isNaN(parsedNumberOfRounds) || parsedNumberOfRounds < 0) parsedNumberOfRounds = 0; // Default a ilimitado si es inválido
    }
    if (params.timePerRound) {
      parsedTimePerRound = parseInt(params.timePerRound as string, 10);
      if (isNaN(parsedTimePerRound) || parsedTimePerRound < 30) parsedTimePerRound = 90; // Default a 90s si es inválido o menor a 30s
    }
    
    if (mounted) {
        setParticipants(parsedParticipants);
        setCharacterListForGame(parsedCharacterList);
        setAvailableCharacters([...parsedCharacterList]);
        setTotalRounds(parsedNumberOfRounds); // Guardar número total de rondas
        setTimePerRound(parsedTimePerRound); // Guardar tiempo por ronda
        setTimeLeft(parsedTimePerRound);     // Establecer tiempo inicial para el primer turno
        setGamePhase('prepare');
    }
    return () => { mounted = false; }
  }, [params.participants, params.characterList, params.numberOfRounds, params.timePerRound, router]); // Añadido router a dependencias

  const selectRandomCharacter = useCallback(() => {
    if (availableCharacters.length === 0) {
      // ¡YA NO HAY PERSONAJES ÚNICOS DISPONIBLES EN ESTA SESIÓN!
      return null; // Indicar que no hay más personajes
    }

    const randomIndex = Math.floor(Math.random() * availableCharacters.length);
    const selected = availableCharacters[randomIndex];
    
    // Eliminar el personaje seleccionado de la lista de disponibles
    setAvailableCharacters(prev => prev.filter(char => char.mal_id !== selected.mal_id));
    
    return selected;
  }, [availableCharacters]); // Solo depende de availableCharacters


  const prepareNextTurn = useCallback(() => {
    if (participants.length === 0) {
      console.error("prepareNextTurn: No hay participantes.");
      setGameOverMessage("Error: No hay participantes.");
      setGamePhase('gameOver');
      return;
    }
    if (characterListForGame.length === 0) {
      console.error("prepareNextTurn: Lista de personajes original vacía.");
      setGameOverMessage("Error: No hay personajes en la lista del juego.");
      setGamePhase('gameOver');
      return;
    }

    let newActorIdx;
    let newRound = round;

    if (round === 0) { // Configuración del PRIMER turno del juego
      newActorIdx = 0;    // El primer actor es el del índice 0
      newRound = 1;       // Esta será la Ronda 1
    } else { // Para turnos subsecuentes
      newActorIdx = (currentActorIndex + 1) % participants.length;
      if (newActorIdx === 0) { // Se completó una vuelta, empieza una nueva ronda
        newRound = round + 1;
      } else {
      }
    }

    // Verificar si el juego terminó por rondas ANTES de seleccionar personaje
    if (totalRounds > 0 && newRound > totalRounds) {
      setGameOverMessage(`¡Se completaron las ${totalRounds} rondas!`);
      setGamePhase('gameOver');
      return;
    }
    
    const selectedChar = selectRandomCharacter();
    if (!selectedChar) {
      setGameOverMessage("¡Se han usado todos los personajes de la lista!");
      setGamePhase('gameOver');
      setCurrentCharacter(null);
      setIsTimerRunning(false);
      return;
    }

    setCurrentCharacter(selectedChar);
    setRound(newRound);
    setCurrentActorIndex(newActorIdx);

    setIsCharacterRevealed(false);
    setIsTimerRunning(false);
    setTimeLeft(timePerRound); // Usar el tiempo configurado
    setGamePhase('acting');
  }, [participants, characterListForGame, selectRandomCharacter, currentActorIndex, round, totalRounds, timePerRound]);

  // useEffect para iniciar/continuar turnos cuando gamePhase es 'prepare'
  useEffect(() => {
    if (gamePhase === 'prepare' && participants.length > 0 && characterListForGame.length > 0) {
      console.log(`           Valores antes de prepareNextTurn: round=${round}, currentActorIndex=${currentActorIndex}`);
      prepareNextTurn(); 
    }
  }, [gamePhase, prepareNextTurn, participants, characterListForGame]); // Mantener participants y characterListForGame por la guarda

  const handleRevealAndStart = () => {
    if (!currentCharacter) {
        Alert.alert("No hay Personaje", "No se ha podido seleccionar un personaje. Intenta de nuevo.");
        setGamePhase('prepare'); // Intentar preparar de nuevo
        return;
    }
    setIsCharacterRevealed(true);
    setIsTimerRunning(true);
    // La lógica de la ronda ya se maneja en prepareNextTurn al ciclar o al iniciar
  };

  const currentActor = participants[currentActorIndex];

  const awardPointsAndProceed = (guesserName: string | null) => {
    // ... (lógica de awardPointsAndProceed sin cambios) ...
    if (guesserName && currentActor) {
      setParticipants(prevParticipants =>
        prevParticipants.map(p => {
          if (p.name === currentActor.name) {
            return { ...p, score: p.score + 1 };
          }
          if (p.name === guesserName) {
            return { ...p, score: p.score + 1 };
          }
          return p;
        })
      );
    } else {
      console.log("Nadie adivinó esta ronda o no se seleccionó adivinador.");
    }
    setIsScoringModalVisible(false);
    setGamePhase('prepare'); // Esto disparará el useEffect para llamar a prepareNextTurn
  };

  // ... (handleGuessed, handleTimeUp, useEffect del temporizador sin cambios significativos, solo llaman a setIsScoringModalVisible) ...
  const handleGuessed = () => {
    if (!isTimerRunning && gamePhase !== 'acting') return;
    setIsTimerRunning(false);
    setGamePhase('scoring');
    setIsScoringModalVisible(true);
  };
  
  const handleTimeUp = () => {
    if (!isTimerRunning && gamePhase !== 'acting') return; 
    setIsTimerRunning(false);
    setGamePhase('scoring');
    setIsScoringModalVisible(true);
  };

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (isTimerRunning && timeLeft > 0) {
      intervalId = setInterval(() => {
        setTimeLeft(prevTime => Math.max(0, prevTime - 1));
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      handleTimeUp();
    }
    return () => clearInterval(intervalId);
  }, [isTimerRunning, timeLeft]);

  const potentialGuessers = participants.filter(p => p.name !== currentActor?.name);


  // Renderizado Condicional Principal
  if (gamePhase === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF"/>
        <Text style={styles.loadingText}>Cargando datos del juego...</Text>
      </View>
    );
  }

  // --- NUEVA PANTALLA DE FIN DE JUEGO ---
  if (gamePhase === 'gameOver') {
    return (
        <View style={styles.centered}>
            <Text style={styles.gameOverTitle}>¡Juego Terminado!</Text>
            {gameOverMessage && <Text style={styles.gameOverSubtitle}>{gameOverMessage}</Text>}
            
            <View style={styles.scoreboardSection}>
                <Text style={styles.scoreboardTitle}>Puntuaciones Finales</Text>
                {participants.sort((a,b) => b.score - a.score).map((p, index) => ( // Ordenar por puntaje
                <Text key={p.name + index} style={[styles.scoreEntry, index === 0 && styles.winnerScore]}> {/* Resaltar ganador */}
                    {index + 1}. {p.name}: {p.score} {index === 0 && p.score > 0 && "🏆"}
                </Text>
                ))}
            </View>

            <View style={styles.gameOverActions}>
                <Pressable 
                    style={[styles.gameButton, {backgroundColor: '#5cb85c', marginBottom:15}]} 
                    onPress={() => {
                        router.replace('/games/mimicsGameSetup'); // Volver al setup
                    }}
                >
                    <Text style={styles.gameButtonText}>Jugar de Nuevo</Text>
                </Pressable>
                <Pressable 
                    style={[styles.gameButton, styles.exitButton]}
                    onPress={() => router.replace('/games')} // Volver a la lista de juegos
                >
                    <Text style={styles.gameButtonText}>Salir a Lista de Juegos</Text>
                </Pressable>
            </View>
        </View>
    );
  }


  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={styles.roundInfo}>
        Ronda: {round} {totalRounds > 0 ? `/ ${totalRounds}` : '(Ilimitadas)'} - Turno de: <Text style={styles.actorNameHighlight}>{currentActor?.name || "N/A"}</Text>
      </Text>
      
      <View style={styles.characterDisplayArea}>
        {gamePhase === 'acting' && !isCharacterRevealed && currentCharacter && ( // Asegurar que currentCharacter no sea null
          <Pressable style={styles.revealButton} onPress={handleRevealAndStart}>
            <Text style={styles.revealButtonText}>Mostrar Personaje y Empezar</Text>
          </Pressable>
        )}
        {gamePhase === 'acting' && !isCharacterRevealed && !currentCharacter && availableCharacters.length > 0 && (
            <Text style={styles.infoText}>Preparando siguiente personaje...</Text>
        )}
         {gamePhase === 'acting' && !isCharacterRevealed && !currentCharacter && availableCharacters.length === 0 && (
            // Esto no debería pasar si gameOver se maneja bien, pero como fallback:
            <Text style={styles.infoText}>No hay más personajes. El juego debería terminar.</Text>
        )}

        {isCharacterRevealed && currentCharacter && (
          <>
            <Text style={styles.characterPrompt}>¡Actúa como!</Text>
            {/* ... (mostrar imagen, nombre, anime_title) ... */}
            {currentCharacter.image_url ? (
            <FastImage 
                style={styles.characterImage}
                source={{ 
                    uri: currentCharacter.image_url,
                    priority: FastImage.priority.normal, // Normal para el juego está bien
                    cache: FastImage.cacheControl.immutable,
                }} 
                resizeMode={FastImage.resizeMode.contain} // Mantener 'contain' que tenías
            />
            ) : (
            <View style={styles.noImagePlaceholder}>
                <Text style={styles.noImageText}>Sin imagen</Text>
            </View>
            )}
            <Text style={styles.characterName}>{currentCharacter.name}</Text>
            <Text style={styles.animeTitleText}>Del anime: {currentCharacter.anime_title}</Text>
          </>
        )}
         {(gamePhase === 'scoring' || gamePhase === 'prepare') && currentCharacter && ( 
          <>
            <Text style={styles.characterPrompt}>Personaje anterior:</Text>
             {currentCharacter.image_url ? ( <Image source={{ uri: currentCharacter.image_url }} style={styles.characterImage} resizeMode="contain" />) : null}
            <Text style={styles.characterName}>{currentCharacter.name}</Text>
            <Text style={styles.animeTitleText}>Del anime: {currentCharacter.anime_title}</Text>
          </>
        )}
      </View>

      <View style={styles.timerArea}>
        <Text style={styles.timerText}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</Text>
        {isTimerRunning && (
          <Pressable style={[styles.gameButton, styles.guessedButton]} onPress={handleGuessed}>
            <Text style={styles.gameButtonText}>¡Adivinaron!</Text>
          </Pressable>
        )}
      </View>

      {gamePhase === 'scoring' && !isScoringModalVisible && (
           <View style={styles.centered}>
               <ActivityIndicator size="small" color="#007AFF"/>
               <Text style={styles.infoText}>Procesando puntuación...</Text>
           </View>
       )}
      
      <View style={styles.scoreboard}>
        <Text style={styles.scoreboardTitle}>Puntuaciones</Text>
        {participants.map((p) => ( // Quitar el index si no se usa para evitar warnings
          <Text key={p.name} style={styles.scoreEntry}>
            {p.name}: {p.score}
          </Text>
        ))}
      </View>

      <Pressable style={[styles.gameButton, styles.exitButton]} onPress={() => {
          Alert.alert(
              "Salir del Juego",
              "¿Estás seguro de que quieres terminar la partida actual? El progreso se perderá.",
              [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Sí, Salir", style: "destructive", onPress: () => router.replace('/games') }
              ]
          );
      }}>
        <Text style={styles.gameButtonText}>Terminar Juego</Text>
      </Pressable>

      {/* Modal de Puntuación */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isScoringModalVisible}
        onRequestClose={() => { /* No hacer nada o manejar con cuidado */ }}
      >
        <View style={styles.centeredModalView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>¿Quién Adivinó?</Text>
            {currentActor && <Text style={styles.modalSubtitle}>(Actuó: {currentActor.name})</Text>}
            
            <ScrollView style={styles.modalOptionsScrollView} contentContainerStyle={{alignItems:'center'}}>
              {potentialGuessers.map((guesser) => (
                <Pressable
                  key={guesser.name}
                  style={[styles.modalButton, styles.modalOptionButton]}
                  onPress={() => awardPointsAndProceed(guesser.name)}
                >
                  <Text style={styles.modalButtonText}>{guesser.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[styles.modalButton, styles.modalNoOneButton]}
              onPress={() => awardPointsAndProceed(null)}
            >
              <Text style={styles.modalButtonText}>Nadie Adivinó / Continuar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Añade estos estilos a tu StyleSheet
const styles = StyleSheet.create({
  // ... (todos tus estilos existentes) ...
  gameOverTitle: { fontSize: 32, fontWeight: 'bold', color: '#007AFF', marginBottom: 15, textAlign: 'center', },
  gameOverSubtitle: { fontSize: 18, color: '#555', textAlign: 'center', marginBottom: 25, },
  gameOverActions: { width: '90%', marginTop: 20, alignItems: 'center',},
  scoreboardSection: { // Estilo para la sección de scoreboard en game over
    width: '90%',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  winnerScore: { // Para resaltar al ganador
    fontWeight: 'bold',
    color: '#28a745', // Verde
  },
  // Estilos del Modal (si no los tenías exactamente así antes)
  centeredModalView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    paddingVertical: 25,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  modalOptionsScrollView: {
    width: '100%',
    marginBottom: 15,
    maxHeight: 200, // Limitar altura si hay muchos participantes
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    width: '90%', // Un poco menos para que se vea centrado en el scrollview
    marginBottom: 10,
    alignItems: 'center',
    alignSelf:'center', // Para centrar dentro del ScrollView
  },
  modalOptionButton: {
    backgroundColor: '#007AFF',
  },
  modalNoOneButton: {
    backgroundColor: '#ff9500',
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  // Otros estilos que ya tenías...
  container: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20, // Añadido para el gameOver y loading
  },
  loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: '#555',
  },
  roundInfo: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  actorNameHighlight: {
    color: '#007AFF',
  },
  characterDisplayArea: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  revealButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  revealButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  characterPrompt: {
    fontSize: 15,
    color: '#444',
    marginBottom: 8,
    fontWeight: '500',
  },
  characterImage: {
    width: 120,
    height: 170,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  noImagePlaceholder: {
    width: 120,
    height: 170,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  noImageText: {
    color: '#777',
    fontSize: 14,
  },
  characterName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0052cc',
    textAlign: 'center',
    marginBottom: 5,
  },
  animeTitleText: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
  },
  timerArea: {
    alignItems: 'center',
    marginBottom: 15,
  },
  timerText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#d9534f', 
    marginBottom:10,
  },
  gameButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minWidth: 180,
  },
  gameButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  guessedButton: {
    backgroundColor: '#5cb85c', 
  },
  nextTurnButton: {
      backgroundColor: '#007AFF', 
  },
  scoringPhaseControls: {
      alignItems: 'center',
      marginVertical: 15,
  },
  infoText: { 
      fontSize: 15,
      fontStyle: 'italic',
      color: '#555',
      marginBottom: 10,
      textAlign: 'center',
  },
  scoreboard: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  scoreboardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  scoreEntry: {
    fontSize: 15,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  exitButton: {
    backgroundColor: '#6c757d', 
    marginTop: 15,
  }
});