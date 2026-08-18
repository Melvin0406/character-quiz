# Character Quiz

App móvil de juegos sociales para grupos de amigos que ven anime. Cada quien arma su lista de personajes a partir de las series que ha visto, y esa lista alimenta los minijuegos — el primero es de mímica: te toca un personaje y tienes que actuarlo.

Construida con React Native y Expo, con Firebase como backend y la [Jikan API](https://jikan.moe/) (MyAnimeList) como catálogo de animes y personajes.

<p align="center">
  <img src="https://github.com/user-attachments/assets/f4df7deb-19e1-41b6-b6a2-672ef8d2b5c0" width="220" alt="Pantalla de inicio de sesión" />
  <img src="https://github.com/user-attachments/assets/4ac16204-5190-4d9d-a936-168b54d73609" width="220" alt="Selección de personajes" />
  <img src="https://github.com/user-attachments/assets/60687486-774f-48b3-a76f-8bd067d1366f" width="220" alt="Juego de mímica" />
</p>

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React Native 0.79 · Expo 53 · TypeScript |
| Navegación | Expo Router (rutas por archivos, grupos `(auth)` / `(tabs)`) |
| Autenticación | Firebase Auth (`@react-native-firebase/auth`) |
| Base de datos | Cloud Firestore |
| Catálogo de anime | Jikan API v4 vía `@tutkli/jikan-ts` |
| Caché | AsyncStorage + `axios-cache-interceptor` |
| Imágenes | `react-native-fast-image` |

---

## Funcionalidades

- **Cuentas y modo invitado.** Registro e inicio de sesión con Firebase Auth, más un modo invitado que persiste localmente para quien no quiere crear cuenta.
- **Catálogo de anime.** Búsqueda de series y personajes contra la Jikan API, con caché de peticiones para no saturar la API pública ni gastar datos.
- **Lista personal.** Los personajes seleccionados se sincronizan en Firestore por usuario y se cachean en AsyncStorage para funcionar sin conexión.
- **Juego de mímica.** Toma personajes de la lista del grupo, los reparte por turnos y lleva la puntuación.
- **Perfil editable.** Cambio de nombre de usuario con propagación a Firestore.

---

## Arquitectura

Estado global mediante dos contextos de React, cada uno con una responsabilidad:

```
context/
├── AuthContext.tsx       # Sesión de Firebase, perfil en Firestore, modo invitado
└── SelectionContext.tsx  # Lista de personajes, sincronización Firestore ↔ AsyncStorage
```

`SelectionContext` consume `AuthContext`: cuando hay sesión iniciada, la lista vive en Firestore; en modo invitado se queda en el dispositivo. Esa decisión está encapsulada en el contexto, así que las pantallas no saben de dónde vienen los datos.

Las rutas usan grupos de Expo Router para separar el flujo autenticado del público:

```
app/
├── (auth)/            # login, signup — accesibles sin sesión
│   └── _layout.tsx
├── (tabs)/            # protegido por el layout raíz
│   ├── home/
│   ├── characters/    # catálogo + lista personal (index, myList, [id])
│   ├── games/         # selección de juego, setup y partida de mímica
│   └── settings/
├── _layout.tsx        # decide entre (auth) y (tabs) según el estado de sesión
└── +not-found.tsx
```

---

## Puesta en marcha

### Requisitos

- Node.js LTS
- Una cuenta de [Firebase](https://console.firebase.google.com/)
- Android Studio (emulador) o un dispositivo físico con Expo Dev Client

> Este proyecto usa `@react-native-firebase`, que necesita código nativo. **No corre en Expo Go** — hay que generar un dev client.

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Firebase

El archivo `google-services.json` **no está en el repositorio** (contiene identificadores del proyecto y está en `.gitignore`). Para correr la app necesitas el tuyo:

1. Crea un proyecto en la [consola de Firebase](https://console.firebase.google.com/).
2. Añade una app de Android con el package name `com.melvin0406.characterquiz` — o cambia `expo.android.package` en `app.json` por el tuyo.
3. Habilita **Authentication → Email/Password** y crea una base de **Firestore**.
4. Descarga `google-services.json` y colócalo en la raíz del proyecto.

### 3. Generar el dev client y correr

```bash
npx expo run:android
```

En arranques posteriores basta con:

```bash
npm start
```

---

## Estructura de datos en Firestore

Un solo documento por usuario, escrito siempre con `merge: true` para que los contextos de sesión y de selección puedan actualizar sus propios campos sin pisarse:

```
users/{uid}
├── uid: string
├── email: string | null
├── username: string
├── createdAt: timestamp
├── selectedCharacterIds: number[]   # IDs de personajes de MyAnimeList
└── cachedAnimesData: object         # metadatos de animes ya consultados
```

`cachedAnimesData` guarda en el propio documento lo que ya se pidió a la Jikan API, de modo que reabrir la lista no dispara peticiones nuevas.

---

## Estado del proyecto

El juego de mímica está funcional de punta a punta. La arquitectura contempla más minijuegos (quizzes, adivinar el personaje), que quedaron planteados pero sin implementar.

---

## Autoría

Desarrollado íntegramente por [Melvin0406](https://github.com/Melvin0406) — 46 de 46 commits.

## Licencia

MIT — ver [LICENSE](LICENSE).
