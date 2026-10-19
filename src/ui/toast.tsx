import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { create } from 'zustand';
import { colors, radius } from '../theme';

interface ToastState {
  message: string | null;
  id: number;
}

const useToastStore = create<ToastState>(() => ({ message: null, id: 0 }));

export function toast(message: string) {
  useToastStore.setState((s) => ({ message, id: s.id + 1 }));
}

export function ToastHost() {
  const { message, id } = useToastStore();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => useToastStore.setState({ message: null }), 2400);
    return () => clearTimeout(t);
  }, [id, message]);

  if (!message) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.pill}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 150, alignItems: 'center', paddingHorizontal: 24 },
  pill: {
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  text: { color: colors.bg, fontSize: 14, fontWeight: '600' },
});
