import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useLang } from '../lib/LanguageContext';

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <View style={s.row}>
      <TouchableOpacity onPress={() => setLang('sv')} style={[s.btn, lang === 'sv' && s.active]}>
        <Text style={s.flag}>🇸🇪</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setLang('en')} style={[s.btn, lang === 'en' && s.active]}>
        <Text style={s.flag}>🇬🇧</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row:    { flexDirection: 'row', gap: 6 },
  btn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', alignItems: 'center', justifyContent: 'center' },
  active: { borderColor: '#f04a18', backgroundColor: '#2b1510' },
  flag:   { fontSize: 20 },
});
