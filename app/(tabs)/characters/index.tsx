import { JikanClient } from '@tutkli/jikan-ts';
import Checkbox from 'expo-checkbox';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
// Asegúrate que la ruta al contexto es correcta
import FastImage from '@d11/react-native-fast-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSelection } from '../../../context/SelectionContext';

const jikanClient = new JikanClient();

// El tipo Anime se usa para la respuesta de la API antes de convertir a CachedAnimeInfo o SelectedCharacter
type ApiAnimeResponse = {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      image_url: string;
    };
  };
  score?: number;
};

export default function AnimeListScreen() {
  const [animesFromApi, setAnimesFromApi] = useState<ApiAnimeResponse[]>([]);
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(true); // Para la carga de la lista de animes
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // NUEVO ESTADO para el input de ir a página específica
  const [targetPageInput, setTargetPageInput] = useState<string>('');

  const router = useRouter();
  // isLoading del contexto es para la carga inicial de AsyncStorage
  const { handleAnimeCheckboxToggle, isAnimeSelected, isLoading: isSelectionLoading } = useSelection();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (page !== 1) setPage(1);
      else if (searchQuery !== debouncedQuery) fetchAnimesFromApi(1, searchQuery); // Forzar fetch si la query cambió pero la página ya era 1
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const fetchAnimesFromApi = async (pageNum: number, query: string) => {
    console.log(`Workspaceing page: ${pageNum}, query: '${query}'`);
    setLoadingList(true); 
    try {
      const response = await jikanClient.anime.getAnimeSearch({
        page: pageNum,
        limit: 25,
        q: query || undefined,
        order_by: 'members',
        sort: 'desc',
      });

      // Mantener el filtro si es necesario
      const filteredAnimes = response.data.filter(
        (anime) => typeof anime.score === 'number' || query || response.data.length > 0
     );

      const uniqueNewAnimes = filteredAnimes.filter(
        (anime, index, self) =>
          index === self.findIndex((a) => a.mal_id === anime.mal_id)
      );
      
      setAnimesFromApi(uniqueNewAnimes);
      setLastPage(response.pagination?.last_visible_page ?? 1);
    } catch (error) {
      console.error('Error fetching animes from API:', error);
      setAnimesFromApi([]); 
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    // Solo fetchear si la selección no está cargando para evitar condiciones de carrera iniciales
    if (!isSelectionLoading) {
        fetchAnimesFromApi(page, debouncedQuery);
    }
  }, [page, debouncedQuery, isSelectionLoading]); // Añadir isSelectionLoading como dependencia


  const renderAnimeItem = ({ item }: { item: ApiAnimeResponse }) => {
    const isSelected = isAnimeSelected(item.mal_id);
    return (
      <View style={styles.card}>
        <Pressable
          style={styles.animeInfoContainer}
          onPress={() => router.push({ 
              pathname: `/characters/[id]`, 
              params: { id: item.mal_id, title: item.title, imageUrl: item.images.jpg.image_url }
            })
          }
        >
          <FastImage
            style={styles.image}
            source={{
              uri: item.images.jpg.image_url,
              priority: FastImage.priority.normal,
              cache: FastImage.cacheControl.immutable,
            }}
            resizeMode={FastImage.resizeMode.cover}
          />
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        </Pressable>
        <Checkbox
          style={styles.checkbox}
          value={isSelected}
          onValueChange={() => {
            handleAnimeCheckboxToggle(
              item.mal_id, 
              item.title, 
              item.images.jpg.image_url
            );
          }}
          color={isSelected ? '#4630EB' : undefined}
        />
      </View>
    );
  }

  // --- NUEVAS FUNCIONES HANDLER ---
  const handleClearSearch = () => {
    setSearchQuery('');
    // setDebouncedQuery(''); // Se actualizará por el useEffect de searchQuery
    // setPage(1); // También se manejará por el useEffect de searchQuery
  };

  const goToFirstPage = () => {
    if (page !== 1) {
      setPage(1);
      setTargetPageInput(''); // Limpiar input si se usa este botón
    }
  };

  const handleGoToPage = () => {
    Keyboard.dismiss(); // Ocultar teclado
    const target = parseInt(targetPageInput, 10);
    if (isNaN(target) || target < 1 || (lastPage !== null && target > lastPage)) {
      Alert.alert("Página Inválida", `Por favor, introduce un número de página entre 1 y ${lastPage || 'la última'}.`);
      setTargetPageInput(String(page)); // Resetear al valor de la página actual o dejarlo para que corrijan
      return;
    }
    if (target !== page) {
      setPage(target);
    }
  };
  // --- FIN NUEVAS FUNCIONES HANDLER ---

  const renderContent = () => {
    // Priorizar el loader del contexto si está cargando datos de AsyncStorage
    if (isSelectionLoading || loadingList) { 
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#666" />
        </View>
      );
    }
    if (animesFromApi.length === 0 && debouncedQuery) {
      return (
        <View style={styles.centered}>
          <Text>No se encontraron animes para "{debouncedQuery}".</Text>
        </View>
      );
    }
    if (animesFromApi.length === 0 && !debouncedQuery) {
        return (
          <View style={styles.centered}>
            <Text>No hay animes para mostrar. Revisa tu conexión o intenta más tarde.</Text>
          </View>
        );
      }
    return (
      <FlatList
        data={animesFromApi}
        keyExtractor={(item) => item.mal_id.toString()}
        renderItem={renderAnimeItem}
        contentContainerStyle={styles.list}
      />
    );
  };

  return (
    <View style={styles.outerContainer}>
      {/* --- INPUT DE BÚSQUEDA MODIFICADO --- */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar anime..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={() => fetchAnimesFromApi(1, searchQuery)} // Opcional: buscar al presionar enter en teclado
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={handleClearSearch} style={styles.clearButton}>
            <FontAwesome name="times-circle" size={20} color="#888" />
          </Pressable>
        )}
      </View>
      {renderContent()}
      {/* Solo mostrar paginación si no está cargando y hay más de una página posible o estamos en una página > 1 */}
      {!loadingList && (lastPage && lastPage > 1) && (
        <View style={styles.paginationContainer}>
          <View style={styles.paginationMainControls}>
            <Pressable
              disabled={page === 1 || loadingList} 
              onPress={goToFirstPage} // Ir a la primera página
              style={[styles.pageButton, (page === 1 || loadingList) && styles.disabledButton]}
            >
              <FontAwesome name="angle-double-left" size={18} color={page === 1 || loadingList ? "#ccc" : "#007AFF"} />
            </Pressable>
            <Pressable
              disabled={page === 1 || loadingList} 
              onPress={() => { if (!loadingList) setPage((prev) => Math.max(prev - 1, 1)); }}
              style={[styles.pageButton, (page === 1 || loadingList) && styles.disabledButton]}
            >
              <FontAwesome name="angle-left" size={18} color={page === 1 || loadingList ? "#ccc" : "#007AFF"} />
            </Pressable>
            
            <Text style={styles.pageNumberText}>Página {page} de {lastPage || '...'}</Text>
            
            <Pressable
              disabled={loadingList || (lastPage !== null && page >= lastPage)}
              onPress={() => { if (!loadingList) setPage((prev) => prev + 1); }}
              style={[styles.pageButton, (loadingList || (lastPage !== null && page >= lastPage)) && styles.disabledButton]}
            >
              <FontAwesome name="angle-right" size={18} color={(loadingList || (lastPage !== null && page >= lastPage)) ? "#ccc" : "#007AFF"} />
            </Pressable>
             <Pressable
              disabled={loadingList || (lastPage !== null && page >= lastPage)}
              onPress={() => { if (!loadingList && lastPage) setPage(lastPage); }}
              style={[styles.pageButton, (loadingList || (lastPage !== null && page >= lastPage)) && styles.disabledButton]}
            >
              <FontAwesome name="angle-double-right" size={18} color={(loadingList || (lastPage !== null && page >= lastPage)) ? "#ccc" : "#007AFF"} />
            </Pressable>
          </View>
          <View style={styles.goToPageSection}>
            <TextInput
              style={styles.pageInput}
              value={targetPageInput}
              onChangeText={setTargetPageInput}
              placeholder="Ir a..."
              keyboardType="number-pad"
              onSubmitEditing={handleGoToPage} // Buscar al presionar enter del teclado
              returnKeyType="go"
            />
            <Pressable onPress={handleGoToPage} style={styles.goButton}>
              <Text style={styles.goButtonText}>Ir</Text>
            </Pressable>
          </View>
        </View> 
      )}
      {/* --- FIN PAGINACIÓN MODIFICADA --- */}
    </View>
  );
}

// ... tus estilos (sin cambios relevantes)
const styles = StyleSheet.create({
  outerContainer: { // Nuevo contenedor principal
    flex: 1,
    backgroundColor: '#f0f0f0', // O el color de fondo que prefieras para toda la pantalla
  },
  searchSection: { // Contenedor para input y botón de limpiar
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white', // Fondo para la barra de búsqueda
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1, // Para que ocupe el espacio disponible
    height: 40, // Altura fija
    backgroundColor: '#f0f0f0', // Un fondo ligero para el input
    borderRadius: 20, // Bordes redondeados
    paddingHorizontal: 15,
    fontSize: 16,
    marginRight: 8, // Espacio antes del botón de limpiar
  },
  clearButton: {
    padding: 5,
  },
  list: {
    paddingHorizontal: 10,
    paddingTop: 10, 
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#fff', // Fondo blanco para las tarjetas
    borderRadius: 12,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  animeInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, 
    marginRight: 10, 
  },
  image: {
    width: 50,
    height: 75, // Un poco más altas
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#e0e0e0', // Placeholder color
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1, 
    color: '#333',
  },
  checkbox: {
    // Estilos si necesitas
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
      marginTop: 10,
      fontSize: 16,
  },
  // Estilos para la nueva paginación
  paginationContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: 'white', // Fondo para la sección de paginación
  },
  paginationMainControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pageButton: {
    padding: 10,
  },
  disabledButton: {
    // Opacidad ya la maneja el color del icono o texto, pero puedes añadir más si quieres
    // opacity: 0.5, 
  },
  pageNumberText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 10, // Espacio alrededor del texto de página
  },
  goToPageSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  pageInput: {
    flex: 1,
    height: 44, // Un poco más pequeño
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
    textAlign: 'center',
    fontSize: 15,
  },
  goButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: 'center',
  },
  goButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
});