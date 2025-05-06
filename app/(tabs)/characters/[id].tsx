// import { JikanClient } from '@tutkli/jikan-ts'; // Ya no se necesita aquí directamente
import Checkbox from 'expo-checkbox';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
// Asegúrate que la ruta al contexto es correcta
import { SelectedCharacter, useSelection } from '../../../context/SelectionContext';

// El tipo CharacterDisplay local para esta pantalla podría ser el mismo que SelectedCharacter
// o uno específico si necesitas más datos solo para la UI aquí.
// Usaremos SelectedCharacter por consistencia.

export default function CharactersScreen() {
  const { id } = useLocalSearchParams();
  const animeId = parseInt(id as string, 10);
  
  const [charactersForDisplay, setCharactersForDisplay] = useState<SelectedCharacter[]>([]);
  const [isLoadingScreen, setIsLoadingScreen] = useState(true);
  const [currentAnimeTitle, setCurrentAnimeTitle] = useState(''); // Para el título de la pantalla
  const [currentAnimeImageUrl, setCurrentAnimeImageUrl] = useState(''); // Para la caché

  const { 
    addCharacter, 
    removeCharacter, 
    isCharacterSelected, 
    getCharactersForAnimeScreen,
    isLoading: isSelectionLoading, // Para saber si el contexto está listo
    selectedCharacters, // Para el checkbox "Seleccionar Todos"
    cachedAnimesData, // Para obtener el título del anime si ya está cacheado
  } = useSelection();
  const navigation = useNavigation();
  const router = useRouter(); // Para volver atrás

  useEffect(() => {
    const fetchAndSetData = async () => {
      if (isSelectionLoading || !animeId) return; // Esperar a que el contexto esté listo y tengamos ID

      setIsLoadingScreen(true);
      // Obtener título e imagen del anime desde la caché si es posible, o de una fuente alternativa
      // Para este ejemplo, asumiremos que la lista de animes ya nos dio un título básico
      // o lo obtenemos al hacer el fetch de personajes.
      // En una app real, podrías pasar el título/imagen como params o tener otra fuente.
      
      // Intentar obtener el título e imagen de la caché primero
      let title = cachedAnimesData[animeId]?.title || 'Anime';
      let imageUrl = cachedAnimesData[animeId]?.image_url || '';

      // Si no está en caché, el título podría venir de params (si lo pasaste) o necesitar un fetch
      // Aquí, getCharactersForAnimeScreen se encargará de cachear el título e imagen si hace fetch.

      const fetchedChars = await getCharactersForAnimeScreen(animeId, title, imageUrl);
      
      // Actualizar título e imagen si se obtuvieron/actualizaron
      if (cachedAnimesData[animeId]) {
          title = cachedAnimesData[animeId].title;
          // imageUrl = cachedAnimesData[animeId].image_url; // Ya la tenemos o se usó
      }
      setCurrentAnimeTitle(title); // Actualizar el título de la pantalla
      setCurrentAnimeImageUrl(imageUrl); // Guardar para uso futuro si es necesario
      setCharactersForDisplay(fetchedChars);
      setIsLoadingScreen(false);
    };

    fetchAndSetData();
  }, [animeId, getCharactersForAnimeScreen, isSelectionLoading, cachedAnimesData]);


  const allOnScreenCharsSelected = charactersForDisplay.length > 0 && 
    charactersForDisplay.every(c => isCharacterSelected(c.mal_id));

  useLayoutEffect(() => {
    if (currentAnimeTitle) {
      navigation.setOptions({
        title: `Personajes de ${currentAnimeTitle}`,
        headerRight: () => charactersForDisplay.length > 0 ? ( // Solo mostrar si hay personajes
          <Pressable 
            onPress={async () => {
              if (allOnScreenCharsSelected) { // Deseleccionar todos los de esta pantalla
                for (const char of charactersForDisplay) {
                  if (isCharacterSelected(char.mal_id)) await removeCharacter(char.mal_id);
                }
              } else { // Seleccionar todos los de esta pantalla
                for (const char of charactersForDisplay) {
                  if (!isCharacterSelected(char.mal_id)) await addCharacter(char);
                }
              }
            }}
            style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}
          >
            <Checkbox
              value={allOnScreenCharsSelected}
              // El Pressable maneja el onValueChange implícitamente
              color={allOnScreenCharsSelected ? '#4630EB' : undefined}
            />
            <Text style={{ marginLeft: 8, fontSize: 16, color: '#007AFF' }}>
              {allOnScreenCharsSelected ? 'Deselec. Todos' : 'Selec. Todos'}
            </Text>
          </Pressable>
        ) : null, // No mostrar si no hay personajes
      });
    }
  }, [navigation, currentAnimeTitle, charactersForDisplay, allOnScreenCharsSelected, addCharacter, removeCharacter, isCharacterSelected]);


  const handleToggleCharacter = async (character: SelectedCharacter) => {
    if (isCharacterSelected(character.mal_id)) {
      await removeCharacter(character.mal_id);
    } else {
      // Al añadir, nos aseguramos que la info de anime_id y anime_title esté correcta
      // La función getCharactersForAnimeScreen ya debería haber formateado 'character' correctamente.
      await addCharacter(character);
    }
  };

  if (isSelectionLoading || isLoadingScreen) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#666" />
      </View>
    );
  }

  if (charactersForDisplay.length === 0) {
    return (
        <View style={styles.centered}>
            <Text>No se encontraron personajes principales para este anime o no se pudo acceder a la API.</Text>
            <Pressable onPress={() => router.back()} style={styles.button}>
                <Text>Volver</Text>
            </Pressable>
        </View>
    );
  }

  return (
    <FlatList
      data={charactersForDisplay}
      keyExtractor={(item) => item.mal_id.toString()}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Image source={{ uri: item.image_url }} style={styles.image} />
          <Text style={styles.name}>{item.name}</Text>
          <Checkbox
            style={styles.checkbox}
            value={isCharacterSelected(item.mal_id)}
            onValueChange={() => handleToggleCharacter(item)}
            color={isCharacterSelected(item.mal_id) ? '#4630EB' : undefined}
          />
        </View>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

// ... tus estilos (añadir estilo para botón de volver si es necesario)
const styles = StyleSheet.create({
  list: {
    padding: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', 
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 10,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  image: {
    width: 50,
    height: 70,
    borderRadius: 6,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1, 
    marginRight: 10,
  },
  checkbox: {
    // Estilos
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
   button: { // Estilo para el botón de volver
    marginTop: 20,
    backgroundColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
});