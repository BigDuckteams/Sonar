import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from './types';

/** Navigate to the screens that sit above the tabs (player, queue, collections…). */
export const useRootNav = () => useNavigation<NativeStackNavigationProp<RootStackParamList>>();

/** Switch between the three tabs. */
export const useTabNav = () => useNavigation<BottomTabNavigationProp<TabParamList>>();
