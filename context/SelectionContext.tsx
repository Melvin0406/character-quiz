// contexts/SelectionContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JikanClient } from '@tutkli/jikan-ts';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

// PASO 1: Cambiar importaciones de Firestore
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from '@react-native-firebase/firestore';

const jikanClient = new JikanClient();

// PASO 2: Obtener la instancia de Firestore
const db = getFirestore();

const SELECTED_CHARACTER_IDS_KEY = '@SelectedCharacterIDs_v3';
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
  const { user, initializing: authInitializing } = useAuth();
  
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<number>>(new Set());
  const [cachedAnimesData, setCachedAnimesData] = useState<Record<number, CachedAnimeInfo>>({});
  const [isLoading, setIsLoading] = useState(true);

  // --- CARGA DE DATOS INICIAL ---
  useEffect(() => {
    const loadData = async () => {
      if (authInitializing) {
        setIsLoading(true); return;
      }
      setIsLoading(true);
      console.log(`SelectionContext: loadData. Usuario: ${user?.uid}, Auth init: ${!authInitializing}`);

      if (user) { // Usuario LOGUEADO
        console.log('SelectionContext: Usuario logueado (UID:', user.uid, '). Cargando de Firestore.');
        try {
          const userDocRef = doc(db, 'users', user.uid); // Modular
          const docSnapshot = await getDoc(userDocRef);  // Modular

          if (docSnapshot.exists()) {
            console.log('SelectionContext: Documento encontrado en Firestore para UID:', user.uid);
            const firestoreData = docSnapshot.data();
            // Cargar datos de selección del documento (pueden no existir si solo se creó el perfil)
            const serverSelectedIds = new Set(firestoreData?.selectedCharacterIds || []);
            const serverCachedAnimes = firestoreData?.cachedAnimesData || {};

            setSelectedCharacterIds(serverSelectedIds as Set<number>);
            setCachedAnimesData(serverCachedAnimes);

            await AsyncStorage.setItem(SELECTED_CHARACTER_IDS_KEY, JSON.stringify(Array.from(serverSelectedIds)));
            await AsyncStorage.setItem(CACHED_ANIMES_DATA_KEY, JSON.stringify(serverCachedAnimes));
            console.log('SelectionContext: Estado local y AsyncStorage actualizados desde Firestore.');
          } else {
            // Esto NO debería pasar si AuthContext.signup SIEMPRE crea el documento de perfil.
            // Si llegamos aquí, es un usuario autenticado sin documento de perfil en Firestore.
            // Esto es un caso anómalo o un usuario que existía en Auth pero no en Firestore.
            // Creamos un documento con los datos de AsyncStorage (que podrían ser de invitado o vacíos).
            console.warn('SelectionContext: NO hay documento en Firestore para UID:', user.uid,'. Esto es inesperado si el signup funciona. Creando con datos de AsyncStorage.');
            const storedSelectedCharIdsJSON = await AsyncStorage.getItem(SELECTED_CHARACTER_IDS_KEY);
            const localCharIdsArray = storedSelectedCharIdsJSON ? JSON.parse(storedSelectedCharIdsJSON) : [];
            const storedCachedAnimesJSON = await AsyncStorage.getItem(CACHED_ANIMES_DATA_KEY);
            const localCachedAnimes = storedCachedAnimesJSON ? JSON.parse(storedCachedAnimesJSON) : {};
            
            setSelectedCharacterIds(new Set<number>(localCharIdsArray));
            setCachedAnimesData(localCachedAnimes);

            // Intentar crear el documento con los datos que tengamos, incluyendo perfil básico si es posible
            // Aunque el perfil básico YA debería haber sido creado por AuthContext.signup.
            // Aquí solo nos preocupamos por los datos de selección.
            await setDoc(userDocRef, { // Usar setDoc con merge:true para añadir a doc existente si signup lo creó sin estos campos
                selectedCharacterIds: localCharIdsArray,
                cachedAnimesData: localCachedAnimes,
            }, { merge: true }); // Usar merge:true para no borrar uid, email, username, createdAt
            console.log('SelectionContext: Documento en Firestore (potencialmente) actualizado/creado con datos de selección desde AsyncStorage.');
          }
        } catch (error) {
          console.error('SelectionContext: Error cargando datos de Firestore. Fallback a AsyncStorage.', error);
          // ... (tu fallback a AsyncStorage) ...
          const storedSelectedCharIds = await AsyncStorage.getItem(SELECTED_CHARACTER_IDS_KEY);
          if (storedSelectedCharIds) setSelectedCharacterIds(new Set<number>(JSON.parse(storedSelectedCharIds))); else setSelectedCharacterIds(new Set<number>());
          const storedCachedAnimes = await AsyncStorage.getItem(CACHED_ANIMES_DATA_KEY);
          if (storedCachedAnimes) setCachedAnimesData(JSON.parse(storedCachedAnimes)); else setCachedAnimesData({});
        }
      } else { // Usuario NO LOGUEADO
        console.log('SelectionContext: Usuario no logueado, cargando datos de AsyncStorage.');
        const storedSelectedCharIds = await AsyncStorage.getItem(SELECTED_CHARACTER_IDS_KEY);
        if (storedSelectedCharIds) setSelectedCharacterIds(new Set(JSON.parse(storedSelectedCharIds))); else setSelectedCharacterIds(new Set());
        const storedCachedAnimes = await AsyncStorage.getItem(CACHED_ANIMES_DATA_KEY);
        if (storedCachedAnimes) setCachedAnimesData(JSON.parse(storedCachedAnimes)); else setCachedAnimesData({});
      }
      
      setIsLoading(false);
      console.log('SelectionContext: Carga de datos finalizada. isLoading:', false);
    };

    loadData();
  }, [user, authInitializing]);

  const canSaveChanges = !isLoading && !authInitializing;

  useEffect(() => { // Guardado de selectedCharacterIds
    if (!canSaveChanges) return;
    const dataToStore = Array.from(selectedCharacterIds);
    AsyncStorage.setItem(SELECTED_CHARACTER_IDS_KEY, JSON.stringify(dataToStore));
    if (user) {
      console.log('SelectionContext (Firestore Modular): Guardando selectedCharacterIds para UID:', user.uid);
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, { selectedCharacterIds: dataToStore }, { merge: true })
        .catch(e => console.error("Firestore save selectedCharIds failed:", e));
    }
  }, [selectedCharacterIds, user, canSaveChanges]);

  useEffect(() => { // Guardado de cachedAnimesData
    if (!canSaveChanges) return;
    AsyncStorage.setItem(CACHED_ANIMES_DATA_KEY, JSON.stringify(cachedAnimesData));
    if (user) {
      console.log('SelectionContext (Firestore Modular): Guardando cachedAnimesData para UID:', user.uid);
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, { cachedAnimesData: cachedAnimesData }, { merge: true })
        .catch(e => console.error("Firestore save cachedAnimesData failed:", e));
    }
  }, [cachedAnimesData, user, canSaveChanges]);
  
  // ... (el resto de las funciones del contexto: isCharacterSelected, isAnimeSelected, addCharacter, etc.
  //      NO necesitan cambios directos en su lógica interna de Firebase, ya que solo modifican el estado
  //      y los useEffects de guardado se encargan de la persistencia.)
  const isCharacterSelected = useCallback((characterId: number) => {return selectedCharacterIds.has(characterId);}, [selectedCharacterIds]);
  const isAnimeSelected = useCallback((animeId: number): boolean => {
    if (authInitializing || isLoading) return false;
    const animeCacheEntry = cachedAnimesData[animeId];
    if (!animeCacheEntry || !animeCacheEntry.characters || animeCacheEntry.characters.length === 0) return false;
    return animeCacheEntry.characters.some(char => selectedCharacterIds.has(char.mal_id));
  }, [selectedCharacterIds, cachedAnimesData, isLoading, authInitializing]);

  const addCharacter = async (character: DetailedCharacterView) => {
    setSelectedCharacterIds(prev => { const newSet = new Set(prev); newSet.add(character.mal_id); return newSet; });
  };
  const removeCharacter = async (characterId: number) => {
    setSelectedCharacterIds(prev => { const next = new Set(prev); next.delete(characterId); return next; });
  };

  const getCharactersForAnimeScreen = async (animeId: number, callerProvidedTitle: string, callerProvidedImageUrl: string): Promise<DetailedCharacterView[]> => {
    // ... (la lógica interna de esta función NO cambia en cuanto a llamadas a Firebase)
    // ... (copia la versión ya corregida de esta función que maneja bien los metadatos)
    let definitiveTitle = callerProvidedTitle;
    let definitiveImageUrl = callerProvidedImageUrl;
    const currentCachedEntry = cachedAnimesData[animeId];
    const needsFreshAnimeMetadata = !currentCachedEntry?.title || currentCachedEntry?.title === 'Anime' || !currentCachedEntry?.image_url || callerProvidedTitle === 'Anime' || callerProvidedTitle === '' || callerProvidedImageUrl === '';
    if (needsFreshAnimeMetadata && !currentCachedEntry?.characters?.length) {
      try {
        const animeDetailsResponse = await jikanClient.anime.getAnimeById(animeId);
        if (animeDetailsResponse.data) {
          definitiveTitle = animeDetailsResponse.data.title_english || animeDetailsResponse.data.title || callerProvidedTitle;
          definitiveImageUrl = animeDetailsResponse.data.images.jpg.image_url || callerProvidedImageUrl;
        }
      } catch (animeDetailsError) {
        console.error(`SelectionContext: Falló el fetch de detalles para anime ID ${animeId}.`, animeDetailsError);
        if (currentCachedEntry?.title && currentCachedEntry.title !== 'Anime') definitiveTitle = currentCachedEntry.title;
        if (currentCachedEntry?.image_url) definitiveImageUrl = currentCachedEntry.image_url;
      }
    } else if (currentCachedEntry?.title && currentCachedEntry.title !== 'Anime') {
      definitiveTitle = currentCachedEntry.title;
      definitiveImageUrl = currentCachedEntry.image_url;
    }
    if (currentCachedEntry?.characters?.length > 0) {
      const needsMetadataUpdateInCache = (currentCachedEntry.title === 'Anime' && definitiveTitle !== 'Anime') || (!currentCachedEntry.image_url && definitiveImageUrl !== '');
      if (needsMetadataUpdateInCache) {
        setCachedAnimesData(prevCache => ({ ...prevCache, [animeId]: { ...prevCache[animeId], title: definitiveTitle, image_url: definitiveImageUrl, }}));
      }
      return currentCachedEntry.characters.map(bc => ({ ...bc, anime_id: animeId, anime_title: cachedAnimesData[animeId]?.title || definitiveTitle, }));
    }
    try {
      const response = await jikanClient.anime.getAnimeCharacters(animeId);
      const fetchedCharactersAsBasic: BasicCharacterInfo[] = response.data.filter(item => item.role === 'Main').map(item => ({ mal_id: item.character.mal_id, name: item.character.name, image_url: item.character.images.jpg.image_url, }));
      setCachedAnimesData(prevCache => ({ ...prevCache, [animeId]: { mal_id: animeId, title: definitiveTitle, image_url: definitiveImageUrl, characters: fetchedCharactersAsBasic, }, }));
      return fetchedCharactersAsBasic.map(bc => ({ ...bc, anime_id: animeId, anime_title: definitiveTitle, }));
    } catch (error) {
      console.error(`SelectionContext: Error en fetch de personajes para anime ID ${animeId}:`, error);
      setCachedAnimesData(prevCache => ({ ...prevCache, [animeId]: { mal_id: animeId, title: definitiveTitle, image_url: definitiveImageUrl, characters: prevCache[animeId]?.characters || [], }, }));
      const existingCachedChars = currentCachedEntry?.characters || [];
      return existingCachedChars.map(bc => ({...bc, anime_id: animeId, anime_title: definitiveTitle}));
    }
  };
  const handleAnimeCheckboxToggle = async (animeId: number, animeTitle: string, animeImageUrl: string) => {
    const currentlySelectedBasedOnItsChars = isAnimeSelected(animeId); 
    const charactersInThisAnimeCached = cachedAnimesData[animeId]?.characters;
    if (currentlySelectedBasedOnItsChars) {
        if (charactersInThisAnimeCached?.length > 0) {
            const idsToRemove = new Set(charactersInThisAnimeCached.map(c => c.mal_id));
            setSelectedCharacterIds(prevGlobalIds => { const nextGlobalIds = new Set(prevGlobalIds); idsToRemove.forEach(id => nextGlobalIds.delete(id)); return nextGlobalIds; });
        }
    } else {
        const allCharsForThisAnime = await getCharactersForAnimeScreen(animeId, animeTitle, animeImageUrl);
        if (allCharsForThisAnime?.length > 0) {
            const idsToSelect = allCharsForThisAnime.map(c => c.mal_id);
            setSelectedCharacterIds(prevGlobalIds => new Set([...Array.from(prevGlobalIds), ...idsToSelect]));
        }
    }
  };
  const clearAllSelections = async () => {
    setSelectedCharacterIds(new Set());
    setCachedAnimesData({});
  };

  return (
    <SelectionContext.Provider
      value={{
        selectedCharacterIds, cachedAnimesData, isLoading,
        addCharacter, removeCharacter, handleAnimeCheckboxToggle,
        isCharacterSelected, isAnimeSelected, getCharactersForAnimeScreen,
        clearAllSelections,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => { /* ... */
    const context = useContext(SelectionContext);
    if (context === undefined) { throw new Error('useSelection must be used within an SelectionProvider');}
    return context;
};