// contexts/SelectionContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JikanClient } from '@tutkli/jikan-ts';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

const jikanClient = new JikanClient();

const SELECTED_CHARACTERS_KEY = '@SelectedCharacters_v2'; // v2 para diferenciar de posibles datos antiguos
const CACHED_ANIMES_DATA_KEY = '@CachedAnimesData_v2';

// Estructura para un personaje seleccionado (guardado localmente)
export interface SelectedCharacter {
  mal_id: number;
  name: string;
  image_url?: string;
  anime_id: number; // ID del anime al que pertenece
  anime_title: string; // Título del anime para referencia rápida
}

// Estructura para los datos de un anime cacheado
export interface CachedAnimeInfo {
  mal_id: number;
  title: string;
  image_url: string; // Imagen del anime
  characters: SelectedCharacter[]; // Lista de personajes principales de este anime
}

interface SelectionContextType {
  selectedCharacters: SelectedCharacter[];
  cachedAnimesData: Record<number, CachedAnimeInfo>; // { [animeId: number]: CachedAnimeInfo }
  isLoading: boolean; // Para saber si se está cargando desde AsyncStorage
  addCharacter: (character: SelectedCharacter) => Promise<void>;
  removeCharacter: (characterId: number) => Promise<void>;
  handleAnimeCheckboxToggle: (animeId: number, animeTitle: string, animeImageUrl: string, navigateToCharacters: () => void) => Promise<void>;
  isCharacterSelected: (characterId: number) => boolean;
  isAnimeSelected: (animeId: number) => boolean; // Indica si AL MENOS un personaje de ese anime está seleccionado
  getCharactersForAnimeScreen: (animeId: number, animeTitle: string, animeImageUrl: string) => Promise<SelectedCharacter[]>; // Para la pantalla de personajes
  clearAllSelections: () => Promise<void>; // Utilidad
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCharacters, setSelectedCharacters] = useState<SelectedCharacter[]>([]);
  const [cachedAnimesData, setCachedAnimesData] = useState<Record<number, CachedAnimeInfo>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos desde AsyncStorage al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const storedSelectedChars = await AsyncStorage.getItem(SELECTED_CHARACTERS_KEY);
        if (storedSelectedChars) {
          setSelectedCharacters(JSON.parse(storedSelectedChars));
        }
        const storedCachedAnimes = await AsyncStorage.getItem(CACHED_ANIMES_DATA_KEY);
        if (storedCachedAnimes) {
          setCachedAnimesData(JSON.parse(storedCachedAnimes));
        }
      } catch (error) {
        console.error('Error loading data from AsyncStorage:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Guardar selectedCharacters en AsyncStorage cuando cambie
  useEffect(() => {
    if (!isLoading) { // No guardar mientras se está cargando inicialmente
      AsyncStorage.setItem(SELECTED_CHARACTERS_KEY, JSON.stringify(selectedCharacters))
        .catch(error => console.error('Error saving selected characters:', error));
    }
  }, [selectedCharacters, isLoading]);

  // Guardar cachedAnimesData en AsyncStorage cuando cambie
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(CACHED_ANIMES_DATA_KEY, JSON.stringify(cachedAnimesData))
        .catch(error => console.error('Error saving cached anime data:', error));
    }
  }, [cachedAnimesData, isLoading]);

  const isCharacterSelected = useCallback((characterId: number) => {
    return selectedCharacters.some((c) => c.mal_id === characterId);
  }, [selectedCharacters]);

  const isAnimeSelected = useCallback((animeId: number) => {
    return selectedCharacters.some((c) => c.anime_id === animeId);
  }, [selectedCharacters]);

  const addCharacter = async (character: SelectedCharacter) => {
    setSelectedCharacters((prev) => {
      if (!prev.find(c => c.mal_id === character.mal_id)) {
        return [...prev, character];
      }
      return prev;
    });
    // Asegurar que el anime y sus personajes (si ya se hizo fetch) estén cacheados
    // Esto se manejará principalmente en getCharactersForAnimeScreen
  };

  const removeCharacter = async (characterId: number) => {
    setSelectedCharacters((prev) => prev.filter((c) => c.mal_id !== characterId));
  };

  const getCharactersForAnimeScreen = async (
    animeId: number,
    animeTitle: string,
    animeImageUrl: string
  ): Promise<SelectedCharacter[]> => {
    // 1. Intentar desde la caché
    if (cachedAnimesData[animeId] && cachedAnimesData[animeId].characters.length > 0) {
      console.log(`Characters for ${animeTitle} (ID: ${animeId}) found in cache.`);
      return cachedAnimesData[animeId].characters;
    }

    // 2. Si no está en caché, hacer fetch (SOLO aquí se hace fetch de personajes)
    console.log(`Workspaceing characters for ${animeTitle} (ID: ${animeId}) from API.`);
    try {
      const response = await jikanClient.anime.getAnimeCharacters(animeId);
      const fetchedApiCharacters = response.data
        .filter((item) => item.role === 'Main') // O tu lógica de filtrado
        .map((item) => ({
          mal_id: item.character.mal_id,
          name: item.character.name,
          image_url: item.character.images.jpg.image_url,
          anime_id: animeId,
          anime_title: animeTitle,
        }));

      // Actualizar caché
      setCachedAnimesData(prevCache => ({
        ...prevCache,
        [animeId]: {
          mal_id: animeId,
          title: animeTitle,
          image_url: animeImageUrl,
          characters: fetchedApiCharacters,
        },
      }));
      return fetchedApiCharacters;
    } catch (error) {
      console.error(`Error fetching characters for anime ${animeId}:`, error);
      // Si falla el fetch, devolver un array vacío o los datos cacheados (si existen parcialmente)
      // pero sin la lista completa de personajes.
      // También, guardar el anime en caché sin personajes para no reintentar inmediatamente.
      setCachedAnimesData(prevCache => ({
        ...prevCache,
        [animeId]: { // Guardar la info básica del anime incluso si falla el fetch de personajes
          mal_id: animeId,
          title: animeTitle,
          image_url: animeImageUrl,
          characters: prevCache[animeId]?.characters || [], // Mantener personajes si ya había algo
        },
      }));
      return cachedAnimesData[animeId]?.characters || [];
    }
  };

  // Lógica para el checkbox del anime en la AnimeListScreen
  const handleAnimeCheckboxToggle = async (
    animeId: number,
    animeTitle: string,
    animeImageUrl: string
    // Ya NO se necesita navigateToCharacters como parámetro para esta lógica específica
  ) => {
    const charactersFromThisAnimeCurrentlySelected = selectedCharacters.filter(c => c.anime_id === animeId);

    if (charactersFromThisAnimeCurrentlySelected.length > 0) {
      // Si hay personajes seleccionados -> deseleccionar TODOS los de este anime
      setSelectedCharacters(prev => prev.filter(c => c.anime_id !== animeId));
      console.log(`Deseleccionados todos los personajes de: ${animeTitle}`);
    } else {
      // Si NO hay personajes seleccionados -> hacer fetch (o usar caché) y seleccionar TODOS
      console.log(`Checkbox de ${animeTitle} (ID: ${animeId}) clickeado (sin selecciones previas), intentando seleccionar todos...`);
      
      // 1. Obtener todos los personajes principales para este anime
      // Esta función ya maneja la caché y el fetch a la API si es necesario.
      const allMainCharactersOfAnime = await getCharactersForAnimeScreen(animeId, animeTitle, animeImageUrl);

      if (allMainCharactersOfAnime && allMainCharactersOfAnime.length > 0) {
        // 2. Añadir estos personajes a la lista de seleccionados, evitando duplicados
        //    (aunque en este flujo, si `charactersFromThisAnimeCurrentlySelected.length` era 0, no debería haber duplicados de *este* anime)
        
        // Crear un Set de los IDs de personajes ya seleccionados para una verificación eficiente
        const currentlySelectedCharacterIds = new Set(selectedCharacters.map(c => c.mal_id));
        
        // Filtrar los personajes del anime que no están ya en la lista global de seleccionados
        const newCharactersToAdd = allMainCharactersOfAnime.filter(
            char => !currentlySelectedCharacterIds.has(char.mal_id)
        );

        if (newCharactersToAdd.length > 0) {
          setSelectedCharacters(prevSelectedChars => [...prevSelectedChars, ...newCharactersToAdd]);
          console.log(`Seleccionados ${newCharactersToAdd.length} nuevos personajes de: ${animeTitle}. Total de personajes del anime: ${allMainCharactersOfAnime.length}.`);
        } else if (allMainCharactersOfAnime.length > 0) {
          // Esto podría pasar si los personajes ya estaban seleccionados por algún otro medio pero el conteo inicial dio 0 (poco probable con la lógica actual)
          // O si todos los personajes del anime ya estaban seleccionados y esta función se llamó incorrectamente.
          console.log(`Todos los personajes de ${animeTitle} ya estaban en la lista de seleccionados.`);
        }
        // Si newCharactersToAdd.length es 0 y allMainCharactersOfAnime.length > 0,
        // significa que todos los personajes de este anime ya estaban seleccionados globalmente.
        // El checkbox debería haberse mostrado como marcado debido a isAnimeSelected.
        // Este bloque asegura que se añadan solo los que falten.
      } else {
        console.log(`No se encontraron personajes para seleccionar para: ${animeTitle} (ID: ${animeId}) o la lista está vacía.`);
      }
    }
  };
  
  const clearAllSelections = async () => {
    setSelectedCharacters([]);
    setCachedAnimesData({}); // Opcional: decidir si quieres limpiar la caché de animes también
    // await AsyncStorage.removeItem(SELECTED_CHARACTERS_KEY);
    // await AsyncStorage.removeItem(CACHED_ANIMES_DATA_KEY);
    // Los useEffect se encargarán de persistir el estado vacío.
    console.log("Todas las selecciones y caché borradas.");
  };


  return (
    <SelectionContext.Provider
      value={{
        selectedCharacters,
        cachedAnimesData,
        isLoading,
        addCharacter,
        removeCharacter,
        handleAnimeCheckboxToggle,
        isCharacterSelected,
        isAnimeSelected,
        getCharactersForAnimeScreen,
        clearAllSelections,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
};