// contexts/SelectionContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore'; // <-- Importar Firestore
import { JikanClient } from '@tutkli/jikan-ts';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

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
  const { user, initializing: authInitializing } = useAuth(); // <-- Obtener estado de autenticación
  
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<number>>(new Set());
  const [cachedAnimesData, setCachedAnimesData] = useState<Record<number, CachedAnimeInfo>>({});
  const [isLoading, setIsLoading] = useState(true); // Único flag de carga principal

  // --- CARGA DE DATOS INICIAL ---
  useEffect(() => {
    const loadData = async () => {
      // Si la autenticación de Firebase aún se está inicializando, esperar.
      if (authInitializing) {
        console.log("SelectionContext: AuthProvider todavía inicializando, loadData no se ejecuta.");
        setIsLoading(true); // Mantener o establecer isLoading a true
        return; 
      }

      console.log(`SelectionContext: loadData ejecutándose. Usuario: ${user?.uid}, Auth inicializado: ${!authInitializing}`);
      setIsLoading(true);

      if (user) { // Usuario LOGUEADO
        console.log('SelectionContext: Usuario logueado (UID:', user.uid, '). Intentando cargar de Firestore.');
        try {
          const userDocRef = firestore().collection('users').doc(user.uid);
          // Para una instalación "limpia", es crucial intentar obtener los datos más frescos del servidor.
          // Firestore por defecto intenta caché primero, luego servidor.
          // Considerar { source: 'server' } si persisten problemas de datos "viejos" en caché local de Firestore en el primer login.
          // const docSnapshot = await userDocRef.get({ source: 'server' }); 
          const docSnapshot = await userDocRef.get();

          if (docSnapshot.exists()) {
            console.log('SelectionContext: Documento encontrado en Firestore para UID:', user.uid);
            const firestoreData = docSnapshot.data();
            const serverSelectedIds = new Set(firestoreData?.selectedCharacterIds || []);
            const serverCachedAnimes = firestoreData?.cachedAnimesData || {};

            setSelectedCharacterIds(serverSelectedIds as Set<number>);
            setCachedAnimesData(serverCachedAnimes);

            await AsyncStorage.setItem(SELECTED_CHARACTER_IDS_KEY, JSON.stringify(Array.from(serverSelectedIds)));
            await AsyncStorage.setItem(CACHED_ANIMES_DATA_KEY, JSON.stringify(serverCachedAnimes));
            console.log('SelectionContext: Estado local y AsyncStorage actualizados desde Firestore.');
          } else {
            console.log('SelectionContext: No hay documento en Firestore para UID:', user.uid,'. Verificando AsyncStorage para posible migración.');
            const storedSelectedCharIdsJSON = await AsyncStorage.getItem(SELECTED_CHARACTER_IDS_KEY);
            const localCharIdsArray = storedSelectedCharIdsJSON ? JSON.parse(storedSelectedCharIdsJSON) : [];
            const storedCachedAnimesJSON = await AsyncStorage.getItem(CACHED_ANIMES_DATA_KEY);
            const localCachedAnimes = storedCachedAnimesJSON ? JSON.parse(storedCachedAnimesJSON) : {};

            setSelectedCharacterIds(new Set(localCharIdsArray));
            setCachedAnimesData(localCachedAnimes);

            if (localCharIdsArray.length > 0 || Object.keys(localCachedAnimes).length > 0) {
              console.log("SelectionContext: Hay datos en AsyncStorage. Escribiendo a Firestore para nuevo usuario:", user.uid);
              await userDocRef.set({
                  selectedCharacterIds: localCharIdsArray,
                  cachedAnimesData: localCachedAnimes,
              });
            } else {
                console.log("SelectionContext: AsyncStorage también vacío. Firestore se creará en el primer guardado de datos.");
                // Opcional: crear un documento vacío si se prefiere que exista desde el login
                // await userDocRef.set({ selectedCharacterIds: [], cachedAnimesData: {} });
            }
          }
        } catch (error) {
          console.error('SelectionContext: Error cargando/manejando datos de Firestore. Usando AsyncStorage como fallback:', error);
          const storedSelectedCharIds = await AsyncStorage.getItem(SELECTED_CHARACTER_IDS_KEY);
          if (storedSelectedCharIds) setSelectedCharacterIds(new Set(JSON.parse(storedSelectedCharIds))); else setSelectedCharacterIds(new Set());
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
      
      setIsLoading(false); // Terminar la carga general
      console.log('SelectionContext: Carga de datos finalizada. isLoading:', false);
    };

    loadData();
  // Este useEffect se ejecuta solo cuando 'user' o 'authInitializing' cambian.
  // Esto es: al inicio (authInitializing true -> false) y al hacer login/logout (user null -> object, o viceversa).
  }, [user, authInitializing]);

  // --- GUARDADO DE DATOS ---
  // Solo guardar si la carga inicial para el usuario actual ha terminado (isLoading es false)
  // Y si la autenticación no está en proceso de inicialización.
  const canSaveChanges = !isLoading && !authInitializing;

  useEffect(() => {
    if (!canSaveChanges) {
        console.log(`SelectionContext: No se guardan selectedCharacterIds. isLoading: ${isLoading}, authInitializing: ${authInitializing}`);
        return;
    }

    const dataToStore = Array.from(selectedCharacterIds);
    AsyncStorage.setItem(SELECTED_CHARACTER_IDS_KEY, JSON.stringify(dataToStore))
      .catch(error => console.error('SelectionContext (AsyncStorage): Error guardando selectedCharacterIds:', error));

    if (user) {
      console.log('SelectionContext (Firestore): Guardando selectedCharacterIds para UID:', user.uid, dataToStore);
      firestore().collection('users').doc(user.uid).set(
        { selectedCharacterIds: dataToStore }, { merge: true } 
      ).catch(error => console.error('SelectionContext (Firestore): Error guardando selectedCharacterIds:', error));
    }
  }, [selectedCharacterIds, user, canSaveChanges, isLoading, authInitializing]); // Añadido isLoading y authInitializing aquí por claridad de la guarda

  useEffect(() => {
    if (!canSaveChanges) {
        console.log(`SelectionContext: No se guardan cachedAnimesData. isLoading: ${isLoading}, authInitializing: ${authInitializing}`);
        return;
    }

    AsyncStorage.setItem(CACHED_ANIMES_DATA_KEY, JSON.stringify(cachedAnimesData))
      .catch(error => console.error('SelectionContext (AsyncStorage): Error guardando cachedAnimesData:', error));

    if (user) {
      console.log('SelectionContext (Firestore): Guardando cachedAnimesData para UID:', user.uid);
      firestore().collection('users').doc(user.uid).set(
        { cachedAnimesData: cachedAnimesData }, { merge: true }
      ).catch(error => console.error('SelectionContext (Firestore): Error guardando cachedAnimesData:', error));
    }
  }, [cachedAnimesData, user, canSaveChanges, isLoading, authInitializing]); // Añadido isLoading y authInitializing

  const isCharacterSelected = useCallback((characterId: number) => { return selectedCharacterIds.has(characterId); }, [selectedCharacterIds]);
  
  const isAnimeSelected = useCallback((animeId: number): boolean => {
    if (authInitializing || isLoading) return false; // Si estamos cargando o auth no está listo, no podemos saber
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

  const getCharactersForAnimeScreen = async (
    animeId: number,
    callerProvidedTitle: string,
    callerProvidedImageUrl: string
  ): Promise<DetailedCharacterView[]> => {
    
    let definitiveTitle = callerProvidedTitle;
    let definitiveImageUrl = callerProvidedImageUrl;
    let metadataWasRefreshed = false; // Para saber si obtuvimos metadatos frescos en esta llamada

    // Condición para determinar si necesitamos obtener/refrescar los metadatos del anime
    const currentCachedEntry = cachedAnimesData[animeId];
    const needsFreshAnimeMetadata = 
      !currentCachedEntry?.title || 
      currentCachedEntry?.title === 'Anime' || 
      !currentCachedEntry?.image_url ||
      callerProvidedTitle === 'Anime' || 
      callerProvidedTitle === '' ||
      callerProvidedImageUrl === '';

    // Intentar obtener detalles del anime si los metadatos parecen placeholders O no existen en caché,
    // Y SI ADEMÁS no tenemos ya los personajes cacheados (para evitar fetch de anime si solo queremos chars cacheados).
    if (needsFreshAnimeMetadata && !currentCachedEntry?.characters?.length) {
      console.log(`SelectionContext: Metadatos para anime ID ${animeId} (Título provisto: "${callerProvidedTitle}") parecen placeholders o faltan. Intentando fetch de detalles del anime...`);
      try {
        const animeDetailsResponse = await jikanClient.anime.getAnimeById(animeId);
        if (animeDetailsResponse.data) {
          definitiveTitle = animeDetailsResponse.data.title_english || animeDetailsResponse.data.title || callerProvidedTitle; // Fallback al provisto si API no da título
          definitiveImageUrl = animeDetailsResponse.data.images.jpg.image_url || callerProvidedImageUrl; // Fallback
          metadataWasRefreshed = true;
          console.log(`SelectionContext: Metadatos frescos obtenidos para anime ID ${animeId}: Título="${definitiveTitle}"`);
        }
      } catch (animeDetailsError) {
        console.error(`SelectionContext: Falló el fetch de detalles para anime ID ${animeId}. Se usarán los datos provistos por el llamador o caché si existen.`, animeDetailsError);
        // Si falla, definitiveTitle e definitiveImageUrl conservan los valores de callerProvided o los mejores de la caché
        if (currentCachedEntry?.title && currentCachedEntry.title !== 'Anime') {
            definitiveTitle = currentCachedEntry.title;
        }
        if (currentCachedEntry?.image_url) {
            definitiveImageUrl = currentCachedEntry.image_url;
        }
      }
    } else if (currentCachedEntry?.title && currentCachedEntry.title !== 'Anime') {
      // Si ya tenemos buenos metadatos en caché y no necesitamos refrescar (o ya tenemos personajes), usarlos.
      definitiveTitle = currentCachedEntry.title;
      definitiveImageUrl = currentCachedEntry.image_url;
    }

    // ---- INICIO DE LA SECCIÓN CORREGIDA ----
    // Ahora, proceder a verificar/obtener personajes
    if (currentCachedEntry?.characters?.length > 0) {
      console.log(`SelectionContext: Personajes para "${definitiveTitle}" (ID: ${animeId}) encontrados en caché.`);
      
      // Si los metadatos en la caché para este anime son placeholders ("Anime" o URL vacía)
      // Y ahora tenemos un definitiveTitle/definitiveImageUrl mejor (porque se refrescaron o el llamador los pasó bien)
      // Actualizamos la entrada de la caché solo para los metadatos, manteniendo los personajes existentes.
      const needsMetadataUpdateInCache = 
          (currentCachedEntry.title === 'Anime' && definitiveTitle !== 'Anime') ||
          (!currentCachedEntry.image_url && definitiveImageUrl !== '');

      if (needsMetadataUpdateInCache) {
          console.log(`SelectionContext: Actualizando metadatos stale en caché para anime ID ${animeId} (Título: "${definitiveTitle}", Imagen: "${definitiveImageUrl ? 'Sí' : 'No'}").`);
          setCachedAnimesData(prevCache => ({
              ...prevCache,
              [animeId]: {
                  // Mantener lo que ya estaba, especialmente los personajes
                  ...prevCache[animeId], 
                  title: definitiveTitle,
                  image_url: definitiveImageUrl,
              }
          }));
      }
      
      return currentCachedEntry.characters.map(bc => ({
        ...bc,
        anime_id: animeId,
        // Usar el título de la caché que podría acabar de actualizarse, o el definitiveTitle
        anime_title: cachedAnimesData[animeId]?.title || definitiveTitle,
      }));
    }
    // ---- FIN DE LA SECCIÓN CORREGIDA ----

    // Si no estaban en caché, hacer fetch de personajes
    console.log(`SelectionContext: Haciendo fetch de personajes para "${definitiveTitle}" (ID: ${animeId}) desde API.`);
    try {
      const response = await jikanClient.anime.getAnimeCharacters(animeId);
      const fetchedCharactersAsBasic: BasicCharacterInfo[] = response.data
        .filter(item => item.role === 'Main') // O tu lógica de filtro
        .map(item => ({
          mal_id: item.character.mal_id,
          name: item.character.name,
          image_url: item.character.images.jpg.image_url,
        }));

      setCachedAnimesData(prevCache => ({
        ...prevCache,
        [animeId]: {
          mal_id: animeId,
          title: definitiveTitle, // Usar el título e imagen definitivos
          image_url: definitiveImageUrl,
          characters: fetchedCharactersAsBasic,
        },
      }));
      
      return fetchedCharactersAsBasic.map(bc => ({
        ...bc,
        anime_id: animeId,
        anime_title: definitiveTitle,
      }));
    } catch (error) {
      console.error(`SelectionContext: Error en fetch de personajes para anime ID ${animeId}:`, error);
      // Guardar la entrada del anime con los metadatos definitivos, incluso si los personajes fallan
      setCachedAnimesData(prevCache => ({
        ...prevCache,
        [animeId]: {
          mal_id: animeId,
          title: definitiveTitle,
          image_url: definitiveImageUrl,
          characters: prevCache[animeId]?.characters || [], 
        },
      }));
      const existingCachedChars = currentCachedEntry?.characters || [];
      return existingCachedChars.map(bc => ({...bc, anime_id: animeId, anime_title: definitiveTitle}));
    }
  };

  const handleAnimeCheckboxToggle = async (animeId: number, animeTitle: string, animeImageUrl: string) => {
    // Es importante que isAnimeSelected use el estado isLoading y authInitializing para dar una respuesta correcta
    const currentlySelectedBasedOnItsChars = isAnimeSelected(animeId); 
    const charactersInThisAnimeCached = cachedAnimesData[animeId]?.characters;
    if (currentlySelectedBasedOnItsChars) {
        if (charactersInThisAnimeCached?.length > 0) {
            const idsToRemove = new Set(charactersInThisAnimeCached.map(c => c.mal_id));
            setSelectedCharacterIds(prevGlobalIds => {
                const nextGlobalIds = new Set(prevGlobalIds);
                idsToRemove.forEach(id => nextGlobalIds.delete(id));
                return nextGlobalIds;
            });
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