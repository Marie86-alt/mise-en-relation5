import { Stack } from 'expo-router';

// Ce layout s'applique uniquement aux écrans dans le dossier (auth)
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}