import { JikanClient } from '@tutkli/jikan-ts';
import Checkbox from 'expo-checkbox';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
// Asegúrate que la ruta al contexto es correcta
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
};

export default function AnimeListScreen() {
  const [animesFromApi, setAnimesFromApi] = useState<ApiAnimeResponse[]>([]);
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(true); // Para la carga de la lista de animes
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const router = useRouter();
  // isLoading del contexto es para la carga inicial de AsyncStorage
  const { handleAnimeCheckboxToggle, isAnimeSelected, isLoading: isSelectionLoading } = useSelection();
  
  // Ya no se necesita animeCharacterSelectionStatus

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); 
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const fetchAnimesFromApi = async (pageNum: number, query: string) => {
    setLoadingList(true); 
    try {
      const response = await jikanClient.anime.getAnimeSearch({
        page: pageNum,
        limit: 25,
        q: query || undefined,
        order_by: 'members',
        sort: 'desc',
      });

      const filteredAnimes = response.data.filter(
        (anime) => typeof anime.score === 'number' || query // Mantén tu lógica de filtro si es necesaria
      );

      const uniqueNewAnimes = filteredAnimes.filter(
        (anime, index, self) =>
          index === self.findIndex((a) => a.mal_id === anime.mal_id)
      );
      setAnimesFromApi(uniqueNewAnimes);
      setLastPage(response.pagination?.last_visible_page ?? null);
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
          onPress={() => router.push(`/characters/${item.mal_id}`)}
        >
          <Image source={{ uri: item.images.jpg.image_url }} style={styles.image} />
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
    <View style={{ flex: 1 }}>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar anime..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {renderContent()}
      {!loadingList && !isSelectionLoading && (lastPage && lastPage > 1) && (
        <View style={styles.pagination}>
          <Pressable
            disabled={page === 1 || loadingList} 
            onPress={() => {
              if (!loadingList) setPage((prev) => Math.max(prev - 1, 1));
            }}
            style={[styles.button, (page === 1 || loadingList) && styles.disabled]}
          >
            <Text>Anterior</Text>
          </Pressable>
          <Text style={styles.pageNumber}>Página {page}</Text>
          <Pressable
            disabled={loadingList || (lastPage !== null && page >= lastPage)}
            onPress={() => {
              if (!loadingList) setPage((prev) => prev + 1);
            }}
            style={[
              styles.button,
              (loadingList || (lastPage !== null && page >= lastPage)) && styles.disabled,
            ]}
          >
            <Text>Siguiente</Text>
          </Pressable>
        </View> 
      )}
    </View>
  );
}

// ... tus estilos (sin cambios relevantes)
const styles = StyleSheet.create({
  searchInput: {
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 5,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#eef',
    borderRadius: 12,
    padding: 10,
  },
  animeInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, 
    marginRight: 10, 
  },
  image: {
    width: 50,
    height: 70,
    borderRadius: 6,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1, 
  },
  checkbox: {
    // Estilos para el checkbox
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  button: {
    backgroundColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: '#eee'
  },
  pageNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});