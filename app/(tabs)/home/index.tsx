// app/home/index.tsx
import { router } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎭 PoseGuess</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Seleccionar Personajes"
          onPress={() => router.push({ pathname: '/(tabs)/characters' })}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Jugar"
          onPress={() => router.push({ pathname: '/(tabs)/games' })}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Ajustes"
          onPress={() => router.push({ pathname: '/(tabs)/settings' })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    marginBottom: 40,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginVertical: 10,
    width: '80%',
  },
});
