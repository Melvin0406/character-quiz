import { JikanClient } from '@tutkli/jikan-ts';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';

const jikanClient = new JikanClient();

type Character = {
  mal_id: number;
  name: string;
  role: string;
  images: {
    jpg: {
      image_url: string;
    };
  };
};

export default function CharactersScreen() {

    const { id } = useLocalSearchParams();
    const animeId = parseInt(id as string, 10);
    
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCharacters = async () => {
            try {
                const response = await jikanClient.anime.getAnimeCharacters(animeId);

        // Filtra personajes con rol "Main" y extrae los datos relevantes
        const mainCharacters = response.data
          .filter((item) => item.role === 'Main')
          .map((item) => ({
            mal_id: item.character.mal_id,
            name: item.character.name,
            role: item.role,
            images: item.character.images,
          }));

        setCharacters(mainCharacters);
      } catch (error) {
        console.error('Error fetching characters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#666" />
      </View>
    );
  }

  return (
    <FlatList
      data={characters}
      keyExtractor={(item) => item.mal_id.toString()}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Image source={{ uri: item.images.jpg.image_url }} style={styles.image} />
          <Text style={styles.name}>{item.name}</Text>
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
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 10,
    elevation: 2,
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});