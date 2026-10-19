import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MiniPlayer } from './src/components/MiniPlayer';
import { applySettings } from './src/player/engine';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { QueueScreen } from './src/screens/QueueScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useDevice } from './src/store/device';
import { useLibrary } from './src/store/library';
import { colors } from './src/theme';
import type { RootStackParamList, TabParamList } from './src/types';
import { PromptHost } from './src/ui/prompt';
import { SheetHost } from './src/ui/sheets';
import { ToastHost } from './src/ui/toast';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.line,
  },
};

type IconPair = [active: keyof typeof Ionicons.glyphMap, idle: keyof typeof Ionicons.glyphMap];
const ICONS: Record<keyof TabParamList, IconPair> = {
  Home: ['home', 'home-outline'],
  Search: ['search', 'search-outline'],
  Library: ['library', 'library-outline'],
};

function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <View style={{ backgroundColor: colors.surface, paddingTop: 6 }}>
          <MiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopWidth: 0 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Главная' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Поиск' }} />
      <Tab.Screen name="Library" component={LibraryScreen} options={{ title: 'Медиатека' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    void useDevice.getState().init();

    // Saved shuffle/repeat/speed go back to the player once the storage has been read.
    const restore = () => applySettings(useLibrary.getState().settings);
    if (useLibrary.persist.hasHydrated()) {
      restore();
      return;
    }
    return useLibrary.persist.onFinishHydration(restore);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
        >
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="Collection" component={CollectionScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Queue"
            component={QueueScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <SheetHost />
      <PromptHost />
      <ToastHost />
    </SafeAreaProvider>
  );
}
