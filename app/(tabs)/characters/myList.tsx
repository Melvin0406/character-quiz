// /app/(tabs)/characters/myList.tsx
import FastImage from '@d11/react-native-fast-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Checkbox from 'expo-checkbox';
import { useFocusEffect, useRouter } from 'expo-router'; // useFocusEffect para recargar datos
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
// Asegúrate que la ruta y los tipos importados del contexto sean correctos
import { CachedAnimeInfo, useSelection } from '../../../context/SelectionContext';

// Tipo para los ítems en esta lista (puede ser más simple que ApiAnimeResponse si solo usas datos de la caché)
interface MyListAnime {
    mal_id: number;
    title: string;
    images: { jpg: { image_url: string; }; };
  }

const ITEMS_PER_PAGE = 25;
const UNDO_TIMEOUT_MS = 4000; // 4 segundos para el snackbar

export default function MyListScreen() {
  const router = useRouter();
  const { 
    selectedCharacterIds, // Para saber si un anime debería estar en la lista
    cachedAnimesData,     // Fuente de la información del anime (título, imagen)
    isAnimeSelected,      // Para filtrar
    handleAnimeCheckboxToggle, 
    isLoading: isSelectionContextLoading 
  } = useSelection();

  // Estados para la lista de "Mis Animes"
  const [sessionAnimeList, setSessionAnimeList] = useState<MyListAnime[]>([]); // Lista para la sesión de vista actual
  const [displayedAnimes, setDisplayedAnimes] = useState<MyListAnime[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [targetPageInput, setTargetPageInput] = useState<string>('');

  // Estado para el Snackbar de "Deshacer"
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
  const [lastToggledAnime, setLastToggledAnime] = useState<MyListAnime | null>(null);
  const [lastActionWasDeselect, setLastActionWasDeselect] = useState(false);
  const undoTimerRef = useRef<number | null>(null);

  // Construir la lista para la sesión actual de la pantalla
  const buildSessionList = useCallback(() => {
    if (isSelectionContextLoading) {
      setIsLoadingList(true);
      return;
    }
    console.log("MyListScreen: Reconstruyendo sessionAnimeList");
    setIsLoadingList(true);
    
    const animesToShowThisSession: MyListAnime[] = [];
    Object.values(cachedAnimesData).forEach((cachedAnime: CachedAnimeInfo) => {
      if (isAnimeSelected(cachedAnime.mal_id)) { // Construir basado en el estado global actual
          animesToShowThisSession.push({
            mal_id: cachedAnime.mal_id,
            title: cachedAnime.title,
            images: { jpg: { image_url: cachedAnime.image_url } },
          });
      }
    });
    animesToShowThisSession.sort((a, b) => a.title.localeCompare(b.title));
    
    setSessionAnimeList(animesToShowThisSession);
    // setIsLoadingList se pondrá a false en el useEffect de paginación/búsqueda
  }, [isSelectionContextLoading, cachedAnimesData, isAnimeSelected]); // isAnimeSelected es un callback, sus dependencias internas son importantes

  // Este useEffect se encarga de construir la lista que se muestra
  // SOLO cuando la pantalla obtiene el foco (o cuando el contexto de selección termina de cargar inicialmente)
  useFocusEffect(
    useCallback(() => {
      // No construir si el contexto global todavía está cargando datos
      if (isSelectionContextLoading) {
        console.log("MyListScreen focused, but SelectionContext is loading. Waiting...");
        setIsLoadingList(true); // Mostrar que estamos esperando/cargando
        return;
      }

      console.log("MyListScreen focused and SelectionContext ready. Building/Rebuilding sessionAnimeList.");
      setIsLoadingList(true);
      
      const animesToShowThisSession: MyListAnime[] = [];
      Object.values(cachedAnimesData).forEach((cachedAnime: CachedAnimeInfo) => {
        // ¡IMPORTANTE! Usar la función isAnimeSelected directamente aquí para obtener el estado MÁS ACTUALIZADO
        // al momento en que la pantalla obtiene el foco.
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
      setPage(1); 
      setSearchQuery('');
      setTargetPageInput('');
      setShowUndoSnackbar(false); // Ocultar snackbar si estaba visible
      if(undoTimerRef.current) clearTimeout(undoTimerRef.current);
      
      // setIsLoadingList(false) ahora se maneja en el useEffect que depende de sessionAnimeList
      return () => {
        if(undoTimerRef.current) clearTimeout(undoTimerRef.current);
      };
    }, [isSelectionContextLoading, cachedAnimesData, router]));
  
  // Paginación y búsqueda local (opera sobre sessionAnimeList)
  useEffect(() => {
    if (isSelectionContextLoading || !sessionAnimeList) { 
        setIsLoadingList(true);
        return;
      }
      if (sessionAnimeList.length === 0 && !searchQuery.trim()) {
        setDisplayedAnimes([]);
        setLastPage(1);
        setPage(1);
        setIsLoadingList(false);
        return;
    }
    setIsLoadingList(true); // Iniciar carga para esta operación

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
    
    // Solo llamar a setPage si el valor realmente necesita cambiar para evitar bucles
    if (currentPage !== page && totalItems > 0) { // Añadido totalItems > 0
        setPage(currentPage); 
    }
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setDisplayedAnimes(listToProcess.slice(startIndex, endIndex));
    
    setIsLoadingList(false); 

  }, [sessionAnimeList, page, searchQuery]);
    
  const handleCheckboxChange = async (item: MyListAnime) => {
    if (undoTimerRef.current) { // Si hay una acción de deshacer pendiente, cancelarla
        clearTimeout(undoTimerRef.current);
    }

    const wasSelectedBeforeToggle = isAnimeSelected(item.mal_id); // Estado global ANTES del toggle

    await handleAnimeCheckboxToggle(item.mal_id, item.title, item.images.jpg.image_url);
    // El estado global ya se actualizó. El checkbox en la UI se actualizará solo.
    // El item NO se quitará de `sessionAnimeList` inmediatamente.

    if (wasSelectedBeforeToggle) { // Significa que la acción fue DESELECCIONAR
      setLastToggledAnime(item);
      setLastActionWasDeselect(true);
      setShowUndoSnackbar(true);
      undoTimerRef.current = setTimeout(() => {
        setShowUndoSnackbar(false);
        setLastToggledAnime(null);
      }, UNDO_TIMEOUT_MS);
    } else { // Significa que la acción fue SELECCIONAR (aunque esto no debería pasar mucho desde "Mi Lista" si solo muestra seleccionados)
      // Podríamos mostrar un mensaje "Seleccionaste X" si quisiéramos, pero el foco es en deshacer deselecciones.
      // Por ahora, no mostramos snackbar si se selecciona.
      setShowUndoSnackbar(false); 
      setLastToggledAnime(null);
    }
  };

  const handleUndoToggle = async () => {
    if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
    }
    if (lastToggledAnime) {
      console.log(`Deshaciendo acción para: ${lastToggledAnime.title}`);
      // Volver a llamar a toggle: si se deseleccionó, esto lo re-seleccionará.
      await handleAnimeCheckboxToggle(lastToggledAnime.mal_id, lastToggledAnime.title, lastToggledAnime.images.jpg.image_url);
    }
    setShowUndoSnackbar(false);
    setLastToggledAnime(null);
  };


  const renderAnimeItem = ({ item }: { item: MyListAnime }) => {
    // El valor del checkbox AHORA SÍ debe reflejar el estado global instantáneo
    const isCurrentlyGloballySelected = isAnimeSelected(item.mal_id); 
    return (
      <View style={styles.card}>
        <Pressable style={styles.animeInfoContainer} onPress={() => router.push({ pathname: `/characters/[id]`, params: { id: item.mal_id, title: item.title, imageUrl: item.images.jpg.image_url }})}>
          <FastImage style={styles.image} source={{ uri: item.images.jpg.image_url, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }} resizeMode={FastImage.resizeMode.cover} />
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        </Pressable>
        <Checkbox
          style={styles.checkbox}
          value={isCurrentlyGloballySelected} // Correcto: refleja el estado global
          onValueChange={() => handleCheckboxChange(item)}
          color={isCurrentlyGloballySelected ? '#4630EB' : undefined}
        />
      </View>
    );
  };

  const handleClearSearch = () => setSearchQuery('');
  const goToFirstPage = () => { if (page !== 1) setPage(1); setTargetPageInput(''); };
  const handleGoToPage = () => { /* ... */ 
    Keyboard.dismiss();
    const target = parseInt(targetPageInput, 10);
    if (isNaN(target) || target < 1 || (lastPage !== null && target > lastPage)) {
      Alert.alert("Página Inválida", `Por favor, introduce un número entre 1 y ${lastPage || '...'}.`);
      setTargetPageInput(String(page));
      return;
    }
    if (target !== page) setPage(target);
  };

  const renderPaginationControls = () => { /* ... */ 
    if (isLoadingList || displayedAnimes.length === 0 || !(lastPage && lastPage > 1)) {
      return null;
    }
    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationMainControls}>
          <Pressable disabled={page === 1} onPress={goToFirstPage} style={[styles.pageButton, page === 1 && styles.disabledButton]}>
            <FontAwesome name="angle-double-left" size={18} color={page === 1 ? "#ccc" : "#007AFF"} />
          </Pressable>
          <Pressable disabled={page === 1} onPress={() => setPage(p => Math.max(1, p - 1))} style={[styles.pageButton, page === 1 && styles.disabledButton]}>
            <FontAwesome name="angle-left" size={18} color={page === 1 ? "#ccc" : "#007AFF"} />
          </Pressable>
          <Text style={styles.pageNumberText}>Página {page} de {lastPage || '...'}</Text>
          <Pressable disabled={page >= (lastPage || 1) } onPress={() => setPage(p => p + 1)} style={[styles.pageButton, page >= (lastPage || 1) && styles.disabledButton]}>
            <FontAwesome name="angle-right" size={18} color={page >= (lastPage || 1) ? "#ccc" : "#007AFF"} />
          </Pressable>
           <Pressable disabled={page >= (lastPage || 1)} onPress={() => { if (lastPage) setPage(lastPage);}} style={[styles.pageButton, page >= (lastPage || 1) && styles.disabledButton]}>
            <FontAwesome name="angle-double-right" size={18} color={page >= (lastPage || 1) ? "#ccc" : "#007AFF"} />
          </Pressable>
        </View>
        <View style={styles.goToPageSection}>
          <TextInput style={styles.pageInput} value={targetPageInput} onChangeText={setTargetPageInput} placeholder="Ir a..." keyboardType="number-pad" onSubmitEditing={handleGoToPage} returnKeyType="go"/>
          <Pressable onPress={handleGoToPage} style={styles.goButton}><Text style={styles.goButtonText}>Ir</Text></Pressable>
        </View>
      </View> 
    );
  };
    
  const renderContent = () => {
    // ... (la lógica de renderContent ahora debe basarse en sessionAnimeList para el mensaje de "lista vacía",
    //      y en displayedAnimes para la FlatList)
    if (isSelectionContextLoading) { 
      return ( <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /><Text style={styles.loadingText}>Cargando contexto...</Text></View> );
    }
    // isLoadingList se refiere a la carga/procesamiento de sessionAnimeList o displayedAnimes
    if (isLoadingList && sessionAnimeList.length === 0 && !searchQuery ) { 
         return ( <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /><Text style={styles.loadingText}>Construyendo tu lista...</Text></View> );
     }
    // Comprobar sessionAnimeList para el mensaje de lista completamente vacía
    if (sessionAnimeList.length === 0 && !searchQuery && !isLoadingList) { 
        return ( <View style={styles.centered}><Text style={styles.emptyListMessage}>No tienes animes con personajes seleccionados.</Text><Pressable onPress={() => router.push('/characters')} style={styles.callToActionButton}><Text style={styles.callToActionButtonText}>Explorar Animes</Text></Pressable></View> );
    }
    // Comprobar displayedAnimes para resultados de búsqueda o paginación
    if (displayedAnimes.length === 0 && searchQuery && !isLoadingList) { 
        return ( <View style={styles.centered}><Text>No se encontraron animes en tu lista para "{searchQuery}".</Text></View> );
    }
    // Si displayedAnimes está vacío pero sessionAnimeList no lo está (y no estamos buscando), podría ser un estado intermedio o página vacía.
    if (displayedAnimes.length === 0 && sessionAnimeList.length > 0 && !isLoadingList && !searchQuery) {
        return ( <View style={styles.centered}><Text>No hay más animes para mostrar en esta página.</Text></View> );
    }
    
    return (
      <FlatList
        data={displayedAnimes} // La FlatList siempre usa displayedAnimes
        keyExtractor={(item) => item.mal_id.toString()}
        renderItem={renderAnimeItem}
        contentContainerStyle={styles.list}
        ListFooterComponent={renderPaginationControls}
        // extraData AHORA DEBE SER ALGO QUE CAMBIE CUANDO selectedCharacterIds CAMBIE
        // para forzar el re-render de los items y actualizar los checkboxes.
        extraData={selectedCharacterIds} 
      />
    );
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.searchSection}>
        {/* ... (Search Input sin cambios) ... */}
        <TextInput style={styles.searchInput} placeholder="Buscar en Mi Lista..." value={searchQuery} onChangeText={setSearchQuery} returnKeyType="search"/>
        {searchQuery.length > 0 && (<Pressable onPress={handleClearSearch} style={styles.clearButton}><FontAwesome name="times-circle" size={20} color="#888" /></Pressable>)}
      </View>
      
      {renderContent()}
      
      {/* Snackbar para Deshacer */}
      {showUndoSnackbar && lastToggledAnime && lastActionWasDeselect && (
        <View style={styles.snackbarContainer}>
          <Text style={styles.snackbarText}>Deseleccionaste "{lastToggledAnime.title}"</Text>
          <Pressable onPress={handleUndoToggle} style={styles.undoButton}>
            <Text style={styles.undoButtonText}>DESHACER</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Copia los estilos de AnimeListScreen.tsx aquí, o impórtalos desde un archivo común.
// AÑADE estos estilos específicos o ajústalos:
const styles = StyleSheet.create({
  // ... (copia todos los estilos de AnimeListScreen que necesites: outerContainer, searchSection, etc.)
  outerContainer: { flex: 1, backgroundColor: '#f0f0f0', },
  searchSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee', },
  searchInput: { flex: 1, height: 40, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, fontSize: 16, marginRight: 8, },
  clearButton: { padding: 5, },
  list: { paddingHorizontal: 10, paddingTop: 10, },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, padding: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, },
  animeInfoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10, },
  image: { width: 50, height: 75, borderRadius: 6, marginRight: 12, backgroundColor: '#e0e0e0', },
  title: { fontSize: 16, fontWeight: '600', flexShrink: 1, color: '#333',},
  checkbox: { /* ... */ },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,},
  loadingText: { marginTop: 10, fontSize: 16, },
  paginationContainer: { paddingVertical: 10, paddingHorizontal: 15, borderTopWidth: 1, borderColor: '#eee', backgroundColor: 'white', },
  paginationMainControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, },
  pageButton: { padding: 10, },
  disabledButton: { /* opacity: 0.5, */ },
  pageNumberText: { fontSize: 15, fontWeight: 'bold', color: '#333', marginHorizontal: 10, },
  goToPageSection: { flexDirection: 'row', alignItems: 'center', marginTop: 5, },
  pageInput: { flex: 1, height: 44, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginRight: 10, textAlign: 'center', fontSize: 15, },
  goButton: { backgroundColor: '#007AFF', paddingVertical: 9, paddingHorizontal: 15, borderRadius: 8, justifyContent: 'center', },
  goButtonText: { color: 'white', fontWeight: '600', fontSize: 15, },
  // Estilos específicos para MyListScreen
  emptyListMessage: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  callToActionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  callToActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    },
  // Añade estilos para el Snackbar:
  snackbarContainer: {
    position: 'absolute',
    bottom: 20, // O un valor que funcione con tu tab bar si estuviera visible
    left: 20,
    right: 20,
    backgroundColor: '#323232', // Color típico de snackbar
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  snackbarText: {
    color: 'white',
    fontSize: 15,
    flexShrink: 1, // Para que el texto no empuje el botón si es largo
    marginRight: 10,
  },
  undoButton: {
    // No necesita fondo, solo el texto
  },
  undoButtonText: {
    color: '#FFD180', // Un color ámbar o amarillo para la acción
    fontWeight: 'bold',
    fontSize: 15,
  },
});