import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { MiniPlayer } from './MiniPlayer';

/**
 * Page frame. Tab screens get their mini player from the tab bar; screens pushed on
 * top of the tabs pass `mini` to keep it visible.
 */
export function Screen({ children, mini = false }: { children: ReactNode; mini?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {children}
      {mini ? (
        <View style={{ paddingTop: 6, paddingBottom: insets.bottom, backgroundColor: colors.surface }}>
          <MiniPlayer />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
