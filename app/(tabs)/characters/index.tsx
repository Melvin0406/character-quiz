// app/(tabs)/characters/index.tsx
import { JikanClient } from '@tutkli/jikan-ts';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

const jikanClient = new JikanClient();

type Anime = {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      image_url: string;
    };
  };
};

export default function AnimeListScreen() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [lastPage, setLastPage] = useState<number | null>(null);


  const router = useRouter();

  useEffect(() => {
    const fetchAnimes = async () => {
      setLoading(true);
      try {
        const response = await jikanClient.anime.getAnimeSearch({
          page,
          limit: 25,
          order_by: 'score',
          sort: 'desc',
        });

        const animesWithScore = response.data.filter(
          (anime) => typeof anime.score === 'number'
        );

        const uniqueAnimes = animesWithScore.filter(
          (anime, index, self) =>
            index === self.findIndex((a) => a.mal_id === anime.mal_id)
        );

        setAnimes(uniqueAnimes);

        setLastPage(response.pagination?.last_visible_page ?? null);
      } catch (error) {
        console.error('Error fetching animes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnimes();
  }, [page]);


  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#666" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={animes}
        keyExtractor={(item) => item.mal_id.toString()}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/characters/${item.mal_id}`)}
          >
            <Image source={{ uri: item.images.jpg.image_url }} style={styles.image} />
            <Text style={styles.title}>{item.title}</Text>
          </Pressable>
        )}
        contentContainerStyle={styles.list}
      />

      {/* 🔽 Navegación por páginas 🔽 */}
      <View style={styles.pagination}>
        <Pressable
          disabled={page === 1}
          onPress={() => setPage((prev) => Math.max(prev - 1, 1))}
          style={[styles.button, page === 1 && styles.disabled]}
        >
          <Text>Anterior</Text>
        </Pressable>
        <Text style={styles.pageNumber}>Página {page}</Text>
        <Pressable
          disabled={lastPage !== null && page >= lastPage}
          onPress={() => setPage((prev) => prev + 1)}
          style={[
            styles.button,
            lastPage !== null && page >= lastPage && styles.disabled,
          ]}
        >
          <Text>Siguiente</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#eef',
    borderRadius: 12,
    padding: 10,
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  button: {
    backgroundColor: '#ccc',
    padding: 10,
    marginHorizontal: 10,
    borderRadius: 6,
  },
  disabled: {
    opacity: 0.5,
  },
  pageNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});