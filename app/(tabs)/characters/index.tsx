// app/characters/index.tsx
import React, { useState } from 'react';
import { Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

export default function CharacterSelectionScreen() {
  const [characterName, setCharacterName] = useState('');
  const [characters, setCharacters] = useState<string[]>([]);

  const addCharacter = () => {
    if (characterName.trim() !== '') {
      setCharacters((prev) => [...prev, characterName.trim()]);
      setCharacterName('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona tus personajes</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre del personaje"
        value={characterName}
        onChangeText={setCharacterName}
      />

      <Button title="Agregar personaje" onPress={addCharacter} />

      <Text style={styles.subtitle}>Tu lista:</Text>
      <FlatList
        data={characters}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={({ item }) => (
          <Text style={styles.listItem}>• {item}</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
  },
  listItem: {
    fontSize: 16,
    paddingVertical: 4,
  },
});