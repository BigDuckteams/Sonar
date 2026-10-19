import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { create } from 'zustand';
import { colors, radius } from '../theme';

interface PromptRequest {
  title: string;
  initial: string;
  confirmLabel: string;
  resolve: (value: string | null) => void;
}

const usePromptStore = create<{ request: PromptRequest | null }>(() => ({ request: null }));

/** Ask for a line of text. Resolves to null when the user cancels. */
export function askText(opts: {
  title: string;
  initial?: string;
  confirmLabel?: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    usePromptStore.setState({
      request: {
        title: opts.title,
        initial: opts.initial ?? '',
        confirmLabel: opts.confirmLabel ?? 'Готово',
        resolve,
      },
    });
  });
}

export function PromptHost() {
  const request = usePromptStore((s) => s.request);
  const [text, setText] = useState('');
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (request) {
      setText(request.initial);
      const t = setTimeout(() => input.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [request]);

  if (!request) return null;

  const finish = (value: string | null) => {
    usePromptStore.setState({ request: null });
    request.resolve(value);
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => finish(null)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => finish(null)} />
        <View style={styles.card}>
          <Text style={styles.title}>{request.title}</Text>
          <TextInput
            ref={input}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => finish(text.trim() || null)}
            placeholder="Название"
            placeholderTextColor={colors.faint}
            style={styles.input}
            returnKeyType="done"
            maxLength={60}
          />
          <View style={styles.buttons}>
            <Pressable onPress={() => finish(null)} style={styles.btn}>
              <Text style={styles.btnText}>Отмена</Text>
            </Pressable>
            <Pressable
              onPress={() => finish(text.trim() || null)}
              style={[styles.btn, styles.primary]}
            >
              <Text style={[styles.btnText, { color: colors.accentInk }]}>{request.confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.surface2, borderRadius: radius.lg, padding: 20, gap: 16 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill },
  primary: { backgroundColor: colors.accent },
  btnText: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
