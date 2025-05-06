// app/games/game.tsx
import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

const exampleCharacters = [
  'Goku',
  'Luffy',
  'Naruto',
  'Link',
  'Kirby',
  'Sakura Kinomoto',
  'Deku',
  'Levi Ackerman',
];

export default function GameScreen() {
  const [currentCharacter, setCurrentCharacter] = useState<string | null>(null);

  const chooseRandomCharacter = () => {
    const random = Math.floor(Math.random() * exampleCharacters.length);
    setCurrentCharacter(exampleCharacters[random]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Imita al personaje!</Text>

      {currentCharacter ? (
        <Text style={styles.character}>{currentCharacter}</Text>
      ) : (
        <Text style={styles.instructions}>Presiona el botón para comenzar</Text>
      )}

      <View style={styles.buttonContainer}>
        <Button title="🎲 Girar personaje" onPress={chooseRandomCharacter} />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="🔄 Reiniciar" onPress={() => setCurrentCharacter(null)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  character: {
    fontSize: 32,
    color: '#d14',
    marginBottom: 40,
  },
  instructions: {
    fontSize: 18,
    marginBottom: 40,
    color: '#666',
  },
  buttonContainer: {
    marginVertical: 10,
    width: '80%',
  },
});