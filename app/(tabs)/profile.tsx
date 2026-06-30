import { View, Text, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Profil</Text>
      <Text style={s.sub}>Kommer snart</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d13', padding: 24, paddingTop: 60 },
  title:     { fontSize: 28, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.6 },
  sub:       { fontSize: 14, color: '#7a85a0', marginTop: 8 },
});
