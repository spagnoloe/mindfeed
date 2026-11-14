import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { useBackend } from '@/backend/BackendProvider';

/** Placeholder until the accounts ticket replaces it with Sign up / Log in. */
export default function PlaceholderScreen() {
  const { auth } = useBackend();
  const session = useQuery({ queryKey: ['session'], queryFn: () => auth.getSession() });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mindfeed</Text>
      {session.isSuccess && <Text>{session.data ? `Signed in as ${session.data.email}` : 'Not signed in'}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 32, fontWeight: '800' },
});
