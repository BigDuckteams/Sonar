import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { hueOf } from '../util';

interface Props {
  uri?: string;
  /** Any string: gives files without artwork a stable colour of their own. */
  seed: string;
  size: number;
  radius?: number;
}

export const Cover = memo(function Cover({ uri, seed, size, radius = 8 }: Props) {
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: radius, backgroundColor: `hsl(${hueOf(seed)}, 38%, 26%)` },
      ]}
    >
      <Ionicons name="musical-note" size={size * 0.42} color="rgba(255,255,255,0.55)" />
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          recyclingKey={uri}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
