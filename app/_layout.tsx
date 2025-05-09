// /app/_layout.tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext'; // Import useAuth
import { SelectionProvider } from '../context/SelectionContext';

// This component handles the navigation logic based on auth state
const InitialLayout = () => {
  const { user, initializing } = useAuth();
  const segments = useSegments(); // Gets the current path segments
  const router = useRouter();

  useEffect(() => {
    if (initializing) {
      return; // Still loading auth state, do nothing yet
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (user && !inAuthGroup) {
      // User is signed in and NOT in the auth group. Stay in the main app.
      // Or potentially redirect to home if they somehow land elsewhere?
      // For now, we assume they are correctly routed if logged in.
      console.log("User logged in, staying in main app flow.");
    } else if (user && inAuthGroup) {
       // User is signed in but currently in the auth group (e.g. navigated back).
       // Redirect them to the main app (e.g., home screen).
       console.log("User logged in but in auth flow, redirecting to /home");
       router.replace('/home'); // Use replace to avoid back button going to auth
    } else if (!user && !inAuthGroup) {
      // User is NOT signed in and NOT in the auth group.
      // Redirect them to the login screen.
      console.log("User not logged in, redirecting to /login");
      router.replace('/(auth)/login'); // Use replace
    } else if (!user && inAuthGroup) {
        // User is not signed in and IS in the auth group. Stay there.
        console.log("User not logged in, staying in auth flow.");
    }
  }, [user, initializing, segments, router]); // Re-run when auth state or route changes

  // While initializing, AuthProvider shows a loader.
  // Once initialized, Slot renders either the (auth) or (tabs) group 
  // based on the redirect logic above.
  return <Slot />;
}

export default function RootLayout() {
  console.log("Rendering RootLayout with AuthProvider > SelectionProvider"); 
  return (
    <AuthProvider>
      <SelectionProvider>
        {/* Use InitialLayout to handle the routing logic */}
        <InitialLayout /> 
      </SelectionProvider>
    </AuthProvider>
  );
}