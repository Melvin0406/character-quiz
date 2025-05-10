import Checkbox from 'expo-checkbox';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
// Asegúrate que la ruta al contexto es correcta y que SelectedCharacter es el tipo esperado
// (equivalente a DetailedCharacterView de mi propuesta de contexto)
import FastImage from '@d11/react-native-fast-image';
import { DetailedCharacterView, useSelection } from '../../../context/SelectionContext';

export default function CharactersScreen() {
  const { id, title: routeTitle, imageUrl: routeImageUrl } = useLocalSearchParams<{ id: string; title?: string; imageUrl?: string }>(); // Tipar los params
  const animeId = parseInt(id as string, 10);
  
  // SelectedCharacter aquí es el tipo DetailedCharacterView del contexto
  const [charactersForDisplay, setCharactersForDisplay] = useState<DetailedCharacterView[]>([]);
  const [isLoadingScreen, setIsLoadingScreen] = useState(true);
  const [currentAnimeTitle, setCurrentAnimeTitle] = useState(routeTitle || 'Anime'); // Usar título de ruta como fallback
  // currentAnimeImageUrl no se usa directamente en el render, pero se pasa a getCharactersForAnimeScreen

  const { 
    addCharacter, 
    removeCharacter, 
    isCharacterSelected, 
    getCharactersForAnimeScreen,
    isLoading: isSelectionLoading, // Para saber si el contexto está listo desde AsyncStorage
    // selectedCharacterIds, // Ya no se necesita el Set directamente aquí, se usa via isCharacterSelected
    cachedAnimesData, 
  } = useSelection();
  const navigation = useNavigation();
  const router = useRouter(); 

  useEffect(() => {
    const fetchAndSetData = async () => {
      if (isSelectionLoading || !animeId) return; 

      setIsLoadingScreen(true);
      
      // Priorizar info de la ruta, luego caché (si no es placeholder), luego placeholder
      const cachedEntry = cachedAnimesData[animeId];
      let titleForFetch = routeTitle || cachedEntry?.title || 'Anime'; // Título a pasar a getCharactersForAnimeScreen
      let imageUrlForFetch = routeImageUrl || cachedEntry?.image_url || ''; // Imagen a pasar

      // Si la caché tiene "Anime" pero la ruta tiene algo mejor, usar el de la ruta
      if (titleForFetch === 'Anime' && routeTitle) {
          titleForFetch = routeTitle;
      }
      if (imageUrlForFetch === '' && routeImageUrl) {
          imageUrlForFetch = routeImageUrl;
      }
      
      // El título de la pantalla se puede poner con lo que tengamos inicialmente
      setCurrentAnimeTitle(titleForFetch !== 'Anime' ? titleForFetch : (routeTitle || 'Cargando título...'));

      const fetchedChars = await getCharactersForAnimeScreen(animeId, titleForFetch, imageUrlForFetch);
      
      // Actualizar el título de la pantalla con lo que getCharactersForAnimeScreen haya resuelto y cacheado
      setCurrentAnimeTitle(cachedAnimesData[animeId]?.title || 'Título no disponible');
      setCharactersForDisplay(fetchedChars);
      setIsLoadingScreen(false);
    };

    fetchAndSetData();
  }, [animeId, getCharactersForAnimeScreen, isSelectionLoading, cachedAnimesData, routeTitle, routeImageUrl]);


  const allOnScreenCharsSelected = charactersForDisplay.length > 0 && 
    charactersForDisplay.every(c => isCharacterSelected(c.mal_id));

  useLayoutEffect(() => {
    if (currentAnimeTitle) {
      navigation.setOptions({
        title: `Personajes de ${currentAnimeTitle}`,
        headerRight: () => charactersForDisplay.length > 0 ? (
          <Pressable 
            onPress={async () => {
              if (allOnScreenCharsSelected) { 
                for (const char of charactersForDisplay) {
                  // No es necesario verificar isCharacterSelected aquí de nuevo, removeCharacter es idempotente para el Set
                  await removeCharacter(char.mal_id);
                }
              } else { 
                for (const char of charactersForDisplay) {
                  // addCharacter también es idempotente para el Set si se añade el mismo ID
                  await addCharacter(char); // char es de tipo SelectedCharacter (DetailedCharacterView)
                }
              }
            }}
            style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}
          >
            <Checkbox
              value={allOnScreenCharsSelected}
              color={allOnScreenCharsSelected ? '#4630EB' : undefined}
            />
            <Text style={{ marginLeft: 8, fontSize: 16, color: '#007AFF' }}>
              {allOnScreenCharsSelected ? 'Deselec. Todos' : 'Selec. Todos'}
            </Text>
          </Pressable>
        ) : null, 
      });
    }
  }, [navigation, currentAnimeTitle, charactersForDisplay, allOnScreenCharsSelected, addCharacter, removeCharacter]); // isCharacterSelected ya no es una dep directa aquí, allOnScreenCharsSelected la usa


  const handleToggleCharacter = async (character: DetailedCharacterView) => { // character es DetailedCharacterView
    if (isCharacterSelected(character.mal_id)) {
      await removeCharacter(character.mal_id);
    } else {
      await addCharacter(character); // Pasamos el objeto completo
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
            <Text style={{textAlign: 'center'}}>No se encontraron personajes principales para "{currentAnimeTitle}" o no se pudo acceder a la API.</Text>
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
      renderItem={({ item }) => ( // item es SelectedCharacter (DetailedCharacterView)
        <View style={styles.card}>
          <FastImage
                style={styles.image}
                source={{
                    uri: item.image_url, // Asumiendo que image_url está en DetailedCharacterView
                    priority: FastImage.priority.normal,
                    cache: FastImage.cacheControl.immutable,
                }}
                resizeMode={FastImage.resizeMode.cover} // O 'contain'
            />
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
   button: { 
    marginTop: 20,
    backgroundColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
});