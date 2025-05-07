// contexts/SelectionContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JikanClient } from '@tutkli/jikan-ts';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

const jikanClient = new JikanClient();

const SELECTED_CHARACTER_IDS_KEY = '@SelectedCharacterIDs_v3'; // Nueva versión para evitar conflictos
const CACHED_ANIMES_DATA_KEY = '@CachedAnimesData_v3';

export interface BasicCharacterInfo { // Para la caché de personajes dentro de un anime
  mal_id: number;
  name: string;
  image_url?: string;
}

export interface CachedAnimeInfo {
  mal_id: number;
  title: string;
  image_url: string;
  characters: BasicCharacterInfo[];
}

export interface DetailedCharacterView { // Para pasar a la pantalla de personajes y al añadir
  mal_id: number;
  name: string;
  image_url?: string;
  anime_id: number; 
  anime_title: string; 
}

interface SelectionContextType {
  selectedCharacterIds: Set<number>;
  cachedAnimesData: Record<number, CachedAnimeInfo>;
  isLoading: boolean;
  addCharacter: (character: DetailedCharacterView) => Promise<void>; // Recibe el detallado para contexto
  removeCharacter: (characterId: number) => Promise<void>;
  handleAnimeCheckboxToggle: (animeId: number, animeTitle: string, animeImageUrl: string) => Promise<void>;
  isCharacterSelected: (characterId: number) => boolean;
  isAnimeSelected: (animeId: number) => boolean;
  getCharactersForAnimeScreen: (animeId: number, animeTitle: string, animeImageUrl: string) => Promise<DetailedCharacterView[]>;
  clearAllSelections: () => Promise<void>;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<number>>(new Set());
  const [cachedAnimesData, setCachedAnimesData] = useState<Record<number, CachedAnimeInfo>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const storedSelectedCharIds = await AsyncStorage.getItem(SELECTED_CHARACTER_IDS_KEY);
        if (storedSelectedCharIds) {
          setSelectedCharacterIds(new Set(JSON.parse(storedSelectedCharIds)));
        }
        const storedCachedAnimes = await AsyncStorage.getItem(CACHED_ANIMES_DATA_KEY);
        if (storedCachedAnimes) {
          setCachedAnimesData(JSON.parse(storedCachedAnimes));
        }
      } catch (error) { /* ... */ } finally { setIsLoading(false); }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(SELECTED_CHARACTER_IDS_KEY, JSON.stringify(Array.from(selectedCharacterIds)))
        .catch(error => console.error('Error saving selected character IDs:', error));
    }
  }, [selectedCharacterIds, isLoading]);

  useEffect(() => { // Este para cachedAnimesData sigue igual
    if (!isLoading) {
      AsyncStorage.setItem(CACHED_ANIMES_DATA_KEY, JSON.stringify(cachedAnimesData))
        .catch(error => console.error('Error saving cached anime data:', error));
    }
  }, [cachedAnimesData, isLoading]);

  const isCharacterSelected = useCallback((characterId: number) => {
    return selectedCharacterIds.has(characterId);
  }, [selectedCharacterIds]);

  const isAnimeSelected = useCallback((animeId: number): boolean => {
    if (isLoading) return false; 

    const animeCacheEntry = cachedAnimesData[animeId];
    if (!animeCacheEntry || !animeCacheEntry.characters || animeCacheEntry.characters.length === 0) {
      return false;
    }
    return animeCacheEntry.characters.some(char => selectedCharacterIds.has(char.mal_id));
  }, [selectedCharacterIds, cachedAnimesData, isLoading]);

  const addCharacter = async (character: DetailedCharacterView) => { // Recibe DetailedCharacterView
    setSelectedCharacterIds(prev => new Set([...Array.from(prev), character.mal_id]));
    // Lógica adicional si se necesita asegurar que el anime de `character.anime_id` esté en caché.
    // Normalmente, getCharactersForAnimeScreen ya lo habría hecho si se llegó desde la pantalla de personajes.
  };

  const removeCharacter = async (characterId: number) => {
    setSelectedCharacterIds(prev => {
      const next = new Set(prev);
      next.delete(characterId);
      return next;
    });
  };

  const getCharactersForAnimeScreen = async (
    animeId: number,
    animeTitle: string,
    animeImageUrl: string
  ): Promise<DetailedCharacterView[]> => {
    if (cachedAnimesData[animeId]?.characters?.length > 0) {
      console.log(`Characters for ${animeTitle} (ID: ${animeId}) found in cache.`);
      return cachedAnimesData[animeId].characters.map(bc => ({
        ...bc, // bc es BasicCharacterInfo
        anime_id: animeId,
        anime_title: animeTitle
      }));
    }

    console.log(`Workspaceing characters for ${animeTitle} (ID: ${animeId}) from API.`);
    try {
      const response = await jikanClient.anime.getAnimeCharacters(animeId);
      // Mapear a BasicCharacterInfo para la caché
      const fetchedCharactersAsBasic: BasicCharacterInfo[] = response.data
        .filter(item => item.role === 'Main')
        .map(item => ({
          mal_id: item.character.mal_id,
          name: item.character.name,
          image_url: item.character.images.jpg.image_url,
        }));

      setCachedAnimesData(prevCache => ({
        ...prevCache,
        [animeId]: {
          mal_id: animeId,
          title: animeTitle,
          image_url: animeImageUrl,
          characters: fetchedCharactersAsBasic,
        },
      }));
      // Mapear a DetailedCharacterView para el retorno
      return fetchedCharactersAsBasic.map(bc => ({
        ...bc,
        anime_id: animeId,
        anime_title: animeTitle
      }));
    } catch (error) {
      console.error(`Error fetching characters for anime ${animeId}:`, error);
      setCachedAnimesData(prevCache => ({
        ...prevCache,
        [animeId]: {
          mal_id: animeId,
          title: animeTitle,
          image_url: animeImageUrl,
          characters: prevCache[animeId]?.characters || [],
        },
      }));
      const existingCachedChars = cachedAnimesData[animeId]?.characters || [];
      return existingCachedChars.map(bc => ({...bc, anime_id: animeId, anime_title: animeTitle}));
    }
  };

  const handleAnimeCheckboxToggle = async (
    animeId: number,
    animeTitle: string,
    animeImageUrl: string
  ) => {
    // Evaluar el estado actual del checkbox ANTES de cualquier cambio
    const currentlySelectedBasedOnItsChars = isAnimeSelected(animeId);

    const charactersInThisAnimeCached = cachedAnimesData[animeId]?.characters;

    if (currentlySelectedBasedOnItsChars) {
      // Si está marcado (o debería estarlo) -> deseleccionar TODOS los personajes de este anime de la lista global
      if (charactersInThisAnimeCached && charactersInThisAnimeCached.length > 0) {
        const idsToRemove = new Set(charactersInThisAnimeCached.map(c => c.mal_id));
        setSelectedCharacterIds(prevGlobalIds => {
          const nextGlobalIds = new Set(prevGlobalIds);
          idsToRemove.forEach(id => nextGlobalIds.delete(id));
          return nextGlobalIds;
        });
        console.log(`Deseleccionados globalmente los personajes de: ${animeTitle}`);
      } else {
        // No hay personajes en caché para este anime, o la lista está vacía.
        // Si estaba marcado, es una situación extraña. No se puede hacer mucho sin saber qué personajes deseleccionar.
        // Podríamos intentar un fetch aquí para ser exhaustivos, pero va contra la idea de minimizar fetches.
        console.log(`Checkbox de ${animeTitle} estaba marcado pero no se encontraron personajes en caché para deseleccionar.`);
        // Forzar fetch y luego deseleccionar podría ser una opción si este caso es problemático:
        // const charsToDeselect = await getCharactersForAnimeScreen(animeId, animeTitle, animeImageUrl);
        // if (charsToDeselect.length > 0) { /* ... lógica de deselección ... */ }
      }
    } else {
      // Si el checkbox estaba vacío (o debería estarlo) -> seleccionar TODOS los personajes de este anime globalmente
      console.log(`Checkbox de ${animeTitle} (ID: ${animeId}) clickeado (vacío), seleccionando todos sus personajes...`);
      
      const allCharsForThisAnime = await getCharactersForAnimeScreen(animeId, animeTitle, animeImageUrl); // Asegura caché y devuelve DetailedCharacterView[]

      if (allCharsForThisAnime && allCharsForThisAnime.length > 0) {
        const idsToSelect = allCharsForThisAnime.map(c => c.mal_id);
        setSelectedCharacterIds(prevGlobalIds => new Set([...Array.from(prevGlobalIds), ...idsToSelect]));
        console.log(`Añadidos/Confirmados ${idsToSelect.length} IDs de personajes globalmente de: ${animeTitle}.`);
      } else {
        console.log(`No se encontraron personajes para seleccionar para: ${animeTitle} (ID: ${animeId}) o la lista de personajes está vacía.`);
      }
    }
  };
  
  const clearAllSelections = async () => {
    setSelectedCharacterIds(new Set());
    // Considera si quieres limpiar toda la caché de animes también, o solo las selecciones.
    // setCachedAnimesData({}); 
    console.log("Todas las selecciones de personajes borradas.");
  };


  return (
    <SelectionContext.Provider
      value={{
        selectedCharacterIds,
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