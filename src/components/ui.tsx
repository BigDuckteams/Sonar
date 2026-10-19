import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, radius, type } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

export function IconButton(props: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  label: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { name, onPress, size = 24, color = colors.text, label, disabled, style } = props;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }, disabled && { opacity: 0.35 }, style]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

export function Button(props: {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  kind?: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  const { label, onPress, icon, kind = 'primary', disabled } = props;
  const primary = kind === 'primary';
  const fg = primary ? colors.accentInk : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        primary ? { backgroundColor: colors.accent } : { backgroundColor: colors.surface2 },
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.4 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip(props: { label: string; selected?: boolean; onPress: () => void }) {
  const { label, selected, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[styles.chipText, selected && { color: colors.accentInk }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>(props: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={styles.seg}>
      {props.options.map((o) => {
        const on = o.id === props.value;
        return (
          <Pressable
            key={o.id}
            onPress={() => props.onChange(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segItem, on && styles.segOn]}
          >
            <Text style={[styles.segText, on && { color: colors.text }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionTitle(props: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      {props.action ? (
        <Pressable onPress={props.onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{props.action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState(props: {
  icon: IconName;
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={props.icon} size={44} color={colors.faint} />
      <Text style={styles.emptyTitle}>{props.title}</Text>
      {props.text ? <Text style={styles.emptyText}>{props.text}</Text> : null}
      {props.actionLabel ? <Button label={props.actionLabel} onPress={props.onAction} /> : null}
    </View>
  );
}

export function Header(props: { title: string; subtitle?: string; back?: boolean; right?: ReactNode }) {
  const nav = useNavigation();
  return (
    <View style={styles.header}>
      {props.back ? (
        <IconButton name="chevron-back" label="Назад" onPress={() => nav.goBack()} style={{ marginLeft: -8 }} />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={props.back ? styles.headerTitleSmall : styles.headerTitle} numberOfLines={1}>
          {props.title}
        </Text>
        {props.subtitle ? (
          <Text style={styles.headerSub} numberOfLines={1}>
            {props.subtitle}
          </Text>
        ) : null}
      </View>
      {props.right}
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: radius.pill,
  },
  btnText: { fontSize: 15, fontWeight: '700' },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  seg: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 3 },
  segItem: { flex: 1, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segOn: { backgroundColor: colors.surface2 },
  segText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  sectionTitle: { ...type.h2, color: colors.text },
  sectionAction: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 32 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, minHeight: 56 },
  headerTitle: { ...type.h1, color: colors.text },
  headerTitleSmall: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerSub: { color: colors.muted, fontSize: 13, marginTop: 1 },
});
