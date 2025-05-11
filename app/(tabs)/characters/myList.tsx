// /app/(tabs)/characters/myList.tsx
import FastImage from '@d11/react-native-fast-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Checkbox from 'expo-checkbox';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CachedAnimeInfo, useSelection } from '../../../context/SelectionContext';

interface MyListAnime {
    mal_id: number;
    title: string;
    images: { jpg: { image_url: string; }; };
}

const ITEMS_PER_PAGE = 25;
const UNDO_TIMEOUT_MS = 4000;

export default function MyListScreen() {
  const router = useRouter();
  const { 
    selectedCharacterIds,
    cachedAnimesData,
    isAnimeSelected,
    handleAnimeCheckboxToggle,
    clearAllSelections, // <--- Obtener la función del contexto
    isLoading: isSelectionContextLoading 
  } = useSelection();

  const [sessionAnimeList, setSessionAnimeList] = useState<MyListAnime[]>([]);
  const [displayedAnimes, setDisplayedAnimes] = useState<MyListAnime[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [targetPageInput, setTargetPageInput] = useState<string>('');

  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
  const [lastToggledAnime, setLastToggledAnime] = useState<MyListAnime | null>(null);
  const [lastActionWasDeselect, setLastActionWasDeselect] = useState(false);
  const undoTimerRef = useRef<number | null>(null);
    const flatListRef = useRef<FlatList<MyListAnime>>(null);
    
    useEffect(() => {
        if (flatListRef.current && displayedAnimes.length > 0) {

           const timer = setTimeout(() => {
             if (flatListRef.current) { // Checar de nuevo por si se desmontó
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
             }
           }, 100); 
           return () => clearTimeout(timer);
        }
      }, [page]);

  // Construir la lista para la sesión actual de la pantalla
  // (Esta función se llama en useFocusEffect)
  const buildSessionList = useCallback(() => {
    if (isSelectionContextLoading) {
      setIsLoadingList(true);
      return;
    }
    console.log("MyListScreen: Reconstruyendo sessionAnimeList");
    setIsLoadingList(true);
    
    const animesToShowThisSession: MyListAnime[] = [];
    Object.values(cachedAnimesData).forEach((cachedAnime: CachedAnimeInfo) => {
      if (isAnimeSelected(cachedAnime.mal_id)) {
        animesToShowThisSession.push({
          mal_id: cachedAnime.mal_id,
          title: cachedAnime.title,
          images: { jpg: { image_url: cachedAnime.image_url } },
        });
      }
    });
    animesToShowThisSession.sort((a, b) => a.title.localeCompare(b.title));
    
    setSessionAnimeList(animesToShowThisSession);
  }, [isSelectionContextLoading, cachedAnimesData, isAnimeSelected]); // isAnimeSelected aquí es correcto para que se reconstruya si el estado global de qué está seleccionado cambia al enfocar.

  useFocusEffect(
    useCallback(() => {
      if (isSelectionContextLoading) {
        console.log("MyListScreen focused, but SelectionContext is loading. Waiting...");
        setIsLoadingList(true);
        return;
      }
      console.log("MyListScreen focused and SelectionContext ready. Building/Rebuilding sessionAnimeList.");
      setPage(1); 
      setSearchQuery('');
      setTargetPageInput('');
      setShowUndoSnackbar(false);
      if(undoTimerRef.current) clearTimeout(undoTimerRef.current);
      buildSessionList(); 
      return () => {
        if(undoTimerRef.current) clearTimeout(undoTimerRef.current);
      };
    // Quitado isAnimeSelected de aquí, buildSessionList ya depende de él y se llama.
    // El objetivo es que este efecto se dispare principalmente por el foco y cambios en los datos base.
    }, [isSelectionContextLoading, cachedAnimesData, buildSessionList, router]) 
  );
  
  // Paginación y búsqueda local
  useEffect(() => {
    // ... (useEffect de paginación sin cambios, sigue operando sobre sessionAnimeList) ...
    if (isSelectionContextLoading || !sessionAnimeList) { 
        setIsLoadingList(true);
        setDisplayedAnimes([]); // Asegurar que no se muestren datos viejos
        return;
    }
    if (sessionAnimeList.length === 0 && !searchQuery.trim()) {
        setDisplayedAnimes([]);
        setLastPage(1);
        setPage(1);
        setIsLoadingList(false);
        return;
    }
    setIsLoadingList(true); 
    let listToProcess = sessionAnimeList;
    if (searchQuery.trim()) {
      listToProcess = sessionAnimeList.filter(anime => 
        anime.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );
    }
    const totalItems = listToProcess.length;
    const calculatedLastPage = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    setLastPage(calculatedLastPage);
    let currentPage = page;
    if (currentPage > calculatedLastPage) currentPage = calculatedLastPage;
    else if (currentPage < 1) currentPage = 1;
    if (currentPage !== page && totalItems > 0) {
        setPage(currentPage); 
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setDisplayedAnimes(listToProcess.slice(startIndex, endIndex));
    setIsLoadingList(false); 
  }, [sessionAnimeList, page, searchQuery, isSelectionContextLoading]);

  // ... (handleCheckboxChange, handleUndoToggle, renderAnimeItem, goToFirstPage, handleGoToPage, renderPaginationControls sin cambios) ...
  const handleCheckboxChange = async (item: MyListAnime) => { /* ... */ 
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); }
    const wasSelectedBeforeToggle = isAnimeSelected(item.mal_id);
    await handleAnimeCheckboxToggle(item.mal_id, item.title, item.images.jpg.image_url);
    if (wasSelectedBeforeToggle) {
      setLastToggledAnime(item);
      setLastActionWasDeselect(true);
      setShowUndoSnackbar(true);
      // @ts-ignore
      undoTimerRef.current = setTimeout(() => { setShowUndoSnackbar(false); setLastToggledAnime(null); }, UNDO_TIMEOUT_MS);
    } else {
      setShowUndoSnackbar(false); 
      setLastToggledAnime(null);
    }
  };
  const handleUndoToggle = async () => { /* ... */ 
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); }
    if (lastToggledAnime) {
      await handleAnimeCheckboxToggle(lastToggledAnime.mal_id, lastToggledAnime.title, lastToggledAnime.images.jpg.image_url);
    }
    setShowUndoSnackbar(false);
    setLastToggledAnime(null);
  };
  const renderAnimeItem = ({ item }: { item: MyListAnime }) => { /* ... */ 
    const isCurrentlyGloballySelected = isAnimeSelected(item.mal_id); 
    return (
      <View style={styles.card}>
        <Pressable style={styles.animeInfoContainer} onPress={() => router.push({ pathname: `/characters/[id]`, params: { id: item.mal_id, title: item.title, imageUrl: item.images.jpg.image_url }})}>
          <FastImage style={styles.image} source={{ uri: item.images.jpg.image_url, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }} resizeMode={FastImage.resizeMode.cover} />
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        </Pressable>
        <Checkbox style={styles.checkbox} value={isCurrentlyGloballySelected} onValueChange={() => handleCheckboxChange(item)} color={isCurrentlyGloballySelected ? '#4630EB' : undefined} />
      </View>
    );
  };
  const handleClearSearch = () => setSearchQuery('');
  const goToFirstPage = () => { if (page !== 1) setPage(1); setTargetPageInput(''); };
  const handleGoToPage = () => { /* ... */ 
    Keyboard.dismiss(); const target = parseInt(targetPageInput, 10); if (isNaN(target) || target < 1 || (lastPage !== null && target > lastPage)) { Alert.alert("Página Inválida", `Por favor, introduce un número entre 1 y ${lastPage || '...'}.`); setTargetPageInput(String(page)); return; } if (target !== page) setPage(target);
  };
  const renderPaginationControls = () => { /* ... */ 
    if (isLoadingList || displayedAnimes.length === 0 || !(lastPage && lastPage > 1)) { return null; }
    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationMainControls}><Pressable disabled={page === 1} onPress={goToFirstPage} style={[styles.pageButton, page === 1 && styles.disabledButton]}><FontAwesome name="angle-double-left" size={18} color={page === 1 ? "#ccc" : "#007AFF"} /></Pressable><Pressable disabled={page === 1} onPress={() => setPage(p => Math.max(1, p - 1))} style={[styles.pageButton, page === 1 && styles.disabledButton]}><FontAwesome name="angle-left" size={18} color={page === 1 ? "#ccc" : "#007AFF"} /></Pressable><Text style={styles.pageNumberText}>Página {page} de {lastPage || '...'}</Text><Pressable disabled={page >= (lastPage || 1) } onPress={() => setPage(p => p + 1)} style={[styles.pageButton, page >= (lastPage || 1) && styles.disabledButton]}><FontAwesome name="angle-right" size={18} color={page >= (lastPage || 1) ? "#ccc" : "#007AFF"} /></Pressable><Pressable disabled={page >= (lastPage || 1)} onPress={() => { if (lastPage) setPage(lastPage);}} style={[styles.pageButton, page >= (lastPage || 1) && styles.disabledButton]}><FontAwesome name="angle-double-right" size={18} color={page >= (lastPage || 1) ? "#ccc" : "#007AFF"} /></Pressable></View>
        <View style={styles.goToPageSection}><TextInput style={styles.pageInput} value={targetPageInput} onChangeText={setTargetPageInput} placeholder="Ir a..." keyboardType="number-pad" onSubmitEditing={handleGoToPage} returnKeyType="go"/><Pressable onPress={handleGoToPage} style={styles.goButton}><Text style={styles.goButtonText}>Ir</Text></Pressable></View>
      </View> 
    );
  };


  // --- NUEVA FUNCIÓN PARA DESELECCIONAR TODO ---
  const handleDeselectAllPress = () => {
    if (sessionAnimeList.length === 0) {
      Alert.alert("Lista Vacía", "No hay animes en tu lista para deseleccionar.");
      return;
    }

    Alert.alert(
      "Confirmar Acción",
      "Esta acción borrará todos los personajes de tu lista y es irreversible (desde esta pantalla). ¿Estás seguro?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Sí, Borrar Todo", 
          onPress: async () => {
            console.log("MyListScreen: Deseleccionando todos los personajes.");
            await clearAllSelections(); // Llama a la función del contexto
            // La lista se actualizará visualmente porque buildSessionList (en useFocusEffect)
            // depende de isAnimeSelected (que a su vez depende de selectedCharacterIds).
            // Cuando selectedCharacterIds se vacíe, isAnimeSelected devolverá false para todo,
            // y en el siguiente ciclo de useFocusEffect (o si forzamos una re-evaluación),
            // sessionAnimeList se vaciará.
            // Para un efecto más inmediato aquí, podrías llamar a buildSessionList o setSessionAnimeList([])
            setSessionAnimeList([]); // Efecto visual inmediato
            // También podrías resetear la paginación si lo deseas
            setPage(1);
            setSearchQuery('');
            Alert.alert("Lista Limpiada", "Todos los personajes han sido eliminados de tu lista.");
          },
          style: 'destructive'
        }
      ]
    );
  };

  const renderContent = () => {
    // ... (lógica de renderContent sin cambios, solo asegúrate que las condiciones de lista vacía usan sessionAnimeList) ...
    if (isSelectionContextLoading) { 
      return ( <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /><Text style={styles.loadingText}>Cargando contexto...</Text></View> );
    }
    if (isLoadingList && (!sessionAnimeList || sessionAnimeList.length === 0) && !searchQuery ) { 
         return ( <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /><Text style={styles.loadingText}>Construyendo tu lista...</Text></View> );
     }
    if (sessionAnimeList && sessionAnimeList.length === 0 && !searchQuery && !isLoadingList) { 
        return ( <View style={styles.centered}><Text style={styles.emptyListMessage}>No tienes animes con personajes seleccionados.</Text><Pressable onPress={() => router.push('/characters')} style={styles.callToActionButton}><Text style={styles.callToActionButtonText}>Explorar Animes</Text></Pressable></View> );
    }
    if (displayedAnimes.length === 0 && searchQuery && !isLoadingList) { 
        return ( <View style={styles.centered}><Text>No se encontraron animes en tu lista para "{searchQuery}".</Text></View> );
    }
    if (displayedAnimes.length === 0 && sessionAnimeList && sessionAnimeList.length > 0 && !isLoadingList && !searchQuery) {
        return ( <View style={styles.centered}><Text>No hay más animes para mostrar en esta página.</Text></View> );
    }
    return (
      <FlatList
        ref={flatListRef}
        data={displayedAnimes}
        keyExtractor={(item) => item.mal_id.toString()}
        renderItem={renderAnimeItem}
        contentContainerStyle={styles.list}
        ListFooterComponent={renderPaginationControls}
        extraData={selectedCharacterIds} 
      />
    );
  };
  
  return (
    <View style={styles.outerContainer}>
      <View style={styles.searchSection}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Buscar en Mi Lista..." 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={handleClearSearch} style={styles.clearSearchButton}>
            <FontAwesome name="times-circle" size={22} color="#888" />
          </Pressable>
        )}
        {/* --- NUEVO BOTÓN DESELECCIONAR TODO --- */}
        <Pressable onPress={handleDeselectAllPress} style={styles.deselectAllButton}>
          <FontAwesome name="trash-o" size={22} color="#FF3B30" /> 
          {/* O un texto: <Text style={styles.deselectAllButtonText}>Limpiar</Text> */}
        </Pressable>
      </View>
      
      {renderContent()}
      
      {showUndoSnackbar && lastToggledAnime && lastActionWasDeselect && (
        /* ... Snackbar JSX sin cambios ... */
        <View style={styles.snackbarContainer}><Text style={styles.snackbarText}>Deseleccionaste "{lastToggledAnime.title}"</Text><Pressable onPress={handleUndoToggle} style={styles.undoButton}><Text style={styles.undoButtonText}>DESHACER</Text></Pressable></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (todos tus estilos existentes)
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1, // Permitir que crezca y se encoja
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    marginRight: 8,
  },
  clearSearchButton: { // Renombrado para claridad
    padding: 5,
    marginRight: 8, // Espacio antes del botón de deseleccionar todo
  },
  deselectAllButton: {
    paddingVertical: 5,
    paddingHorizontal: 10, // Un poco de padding para el área de toque
    // backgroundColor: '#FFEEEE', // Opcional: un fondo sutil
    // borderRadius: 8,
  },
  // deselectAllButtonText: { // Si usas texto en lugar de icono
  //   color: '#FF3B30',
  //   fontWeight: '600',
  //   fontSize: 15,
  // },
  // ... (el resto de tus estilos)
  outerContainer: { flex: 1, backgroundColor: '#f0f0f0', },
  list: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 20 }, 
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, padding: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, },
  animeInfoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10, },
  image: { width: 50, height: 75, borderRadius: 6, marginRight: 12, backgroundColor: '#e0e0e0', },
  title: { fontSize: 16, fontWeight: '600', flexShrink: 1, color: '#333',},
  checkbox: { /* ... */ },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,},
  loadingText: { marginTop: 10, fontSize: 16, color: '#555', },
  paginationContainer: { paddingVertical: 10, paddingHorizontal: 15, borderTopWidth: 1, borderColor: '#eee', backgroundColor: 'white', },
  paginationMainControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, },
  pageButton: { padding: 10, },
  disabledButton: { /* opacity: 0.5, */ },
  pageNumberText: { fontSize: 15, fontWeight: 'bold', color: '#333', marginHorizontal: 10, },
  goToPageSection: { flexDirection: 'row', alignItems: 'center', marginTop: 5, },
  pageInput: { flex: 1, height: 44, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginRight: 10, textAlign: 'center', fontSize: 15, },
  goButton: { backgroundColor: '#007AFF', paddingVertical: 9, paddingHorizontal: 15, borderRadius: 8, justifyContent: 'center', },
  goButtonText: { color: 'white', fontWeight: '600', fontSize: 15, },
  emptyListMessage: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 20, },
  callToActionButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, },
  callToActionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', },
  snackbarContainer: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#323232', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, },
  snackbarText: { color: 'white', fontSize: 15, flexShrink: 1, marginRight: 10, },
  undoButton: {},
  undoButtonText: { color: '#FFD180', fontWeight: 'bold', fontSize: 15, },
});