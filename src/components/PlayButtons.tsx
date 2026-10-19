import { StyleSheet, View } from 'react-native';
import { playShuffled, playTracks } from '../player/engine';
import type { Track } from '../types';
import { Button } from './ui';

export function PlayButtons({ tracks }: { tracks: Track[] }) {
  const empty = tracks.length === 0;
  return (
    <View style={styles.row}>
      <View style={styles.cell}>
        <Button
          label="Слушать"
          icon="play"
          disabled={empty}
          onPress={() => playTracks(tracks, 0, { shuffle: false })}
        />
      </View>
      <View style={styles.cell}>
        <Button label="Вперемешку" icon="shuffle" kind="ghost" disabled={empty} onPress={() => playShuffled(tracks)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  cell: { flex: 1 },
});
