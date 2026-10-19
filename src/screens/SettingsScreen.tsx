import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Header, SectionTitle } from '../components/ui';
import { useDevice } from '../store/device';
import { useLibrary } from '../store/library';
import { colors, radius } from '../theme';
import { countTracks } from '../util';
import { toast } from '../ui/toast';

const STATUS_TEXT: Record<string, string> = {
  idle: 'Не проверено',
  checking: 'Проверяем доступ…',
  scanning: 'Ищем музыку…',
  ready: 'Доступ есть',
  'needs-permission': 'Доступ не выдан',
  denied: 'Доступ не выдан',
  blocked: 'Доступ выключен в настройках телефона',
  unsupported: 'Недоступно на этой платформе',
  error: 'Ошибка чтения',
};

export function SettingsScreen() {
  const autoplay = useLibrary((s) => s.settings.autoplay);
  const updateSettings = useLibrary((s) => s.updateSettings);
  const clearHistory = useLibrary((s) => s.clearHistory);
  const device = useDevice();

  const confirmClear = () =>
    Alert.alert('Очистить историю?', 'Пропадут «Недавно играло» и «Часто слушаете». Избранное и плейлисты останутся.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Очистить',
        style: 'destructive',
        onPress: () => {
          clearHistory();
          toast('История очищена');
        },
      },
    ]);

  return (
    <Screen mini>
      <Header back title="Настройки" />
      <ScrollView contentContainerStyle={styles.body}>
        <SectionTitle title="Воспроизведение" />
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Продолжать музыку</Text>
              <Text style={styles.hint}>
                Когда очередь с треками Audius закончится, Sonar сам подберёт похожие из того же жанра.
              </Text>
            </View>
            <Switch
              value={autoplay}
              onValueChange={(v) => updateSettings({ autoplay: v })}
              trackColor={{ true: colors.accent, false: colors.line }}
              thumbColor={colors.text}
            />
          </View>
        </View>

        <SectionTitle title="Музыка на телефоне" />
        <View style={styles.card}>
          <Text style={styles.label}>{STATUS_TEXT[device.status] ?? device.status}</Text>
          {device.status === 'ready' ? <Text style={styles.hint}>Найдено: {countTracks(device.tracks.length)}</Text> : null}
          <Text style={styles.hint}>
            Названия и исполнители берутся из имён файлов («Исполнитель - Название.mp3»). Файлы не копируются
            и не покидают телефон.
          </Text>
          <View style={styles.buttons}>
            <Button label="Обновить список" icon="refresh" kind="ghost" onPress={() => void device.request()} />
            <Button label="Доступ в настройках" icon="settings-outline" kind="ghost" onPress={() => void Linking.openSettings()} />
          </View>
        </View>

        <SectionTitle title="Данные" />
        <View style={styles.card}>
          <Text style={styles.hint}>Избранное, плейлисты и история хранятся только на этом телефоне.</Text>
          <Button label="Очистить историю прослушивания" icon="trash-outline" kind="ghost" onPress={confirmClear} />
        </View>

        <SectionTitle title="О Sonar" />
        <View style={styles.card}>
          <Text style={styles.label}>Sonar 1.0</Text>
          <Text style={styles.hint}>
            Личный плеер: ваша скачанная музыка и полные треки независимых артистов — в одном месте, без
            регистрации. Только полные треки, без превью.
          </Text>
          <Text style={styles.hint}>
            Audius (api.audius.co): музыка принадлежит авторам, которые сами её загрузили.{'\n'}
            Звуковой движок @rntp/player бесплатен для личного некоммерческого использования; для публикации
            приложения нужна коммерческая лицензия.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { color: colors.text, fontSize: 16, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  buttons: { gap: 10, marginTop: 4 },
});
