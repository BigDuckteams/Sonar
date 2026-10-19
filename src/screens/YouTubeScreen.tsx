import TrackPlayer, { useIsPlaying } from '@rntp/player';
import { useFocusEffect, useIsFocused, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import type { ComponentRef } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Linking, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Screen } from '../components/Screen';
import { EmptyState, Header, IconButton } from '../components/ui';
import { colors } from '../theme';
import type { TabParamList } from '../types';

/**
 * The official YouTube mobile site inside Sonar: its own search and player, full
 * songs from the channels of the artists and labels. Plays only while Sonar is in the
 * foreground (background play is a paid YouTube feature), so the video is paused
 * whenever the app leaves the screen.
 */
const HOME = 'https://m.youtube.com/';
const searchUrl = (q: string) => `https://m.youtube.com/results?search_query=${encodeURIComponent(q)}`;

const ALLOWED_HOST = /(^|\.)(youtube\.com|youtu\.be|google\.com|gstatic\.com)$/i;

const PAUSE_JS = "document.querySelectorAll('video').forEach(function (v) { v.pause(); }); true;";

// Media events don't bubble, but a capturing listener on the document still sees them.
const WATCH_JS = `
(function () {
  function send(state) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(state); }
  document.addEventListener('play', function () { send('play'); }, true);
  document.addEventListener('pause', function () { send('pause'); }, true);
  document.addEventListener('ended', function () { send('pause'); }, true);
})();
true;
`;

function hostOf(url: string): string {
  const m = url.match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1] : '';
}

/** Keeps the screen on; mounted only while a video is actually playing on this tab. */
function StayAwake() {
  useKeepAwake('sonar-youtube');
  return null;
}

export function YouTubeScreen() {
  const route = useRoute<RouteProp<TabParamList, 'YouTube'>>();
  const query = route.params?.query;
  const nonce = route.params?.nonce;
  const focused = useIsFocused();
  const sonarPlaying = useIsPlaying();

  const web = useRef<ComponentRef<typeof WebView>>(null);
  const [initialUrl] = useState(() => (query ? searchUrl(query) : HOME));
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [canGoBack, setCanGoBack] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const pauseVideo = useCallback(() => web.current?.injectJavaScript(PAUSE_JS), []);
  const go = useCallback((url: string) => {
    web.current?.injectJavaScript(`window.location.assign(${JSON.stringify(url)}); true;`);
  }, []);

  // A search handed over from the Sonar search screen.
  useEffect(() => {
    if (query && nonce) go(searchUrl(query));
  }, [query, nonce, go]);

  // Foreground only: leaving the app (or locking the screen) pauses the video.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') pauseVideo();
    });
    return () => sub.remove();
  }, [pauseVideo]);

  // Never two sources at once: Sonar starting its own music pauses the video.
  useEffect(() => {
    if (sonarPlaying) pauseVideo();
  }, [sonarPlaying, pauseVideo]);

  // Android back walks back through YouTube pages before leaving the tab.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!canGoBack) return false;
        web.current?.goBack();
        return true;
      });
      return () => sub.remove();
    }, [canGoBack]),
  );

  if (Platform.OS === 'web') {
    return (
      <Screen>
        <Header title="YouTube" />
        <EmptyState
          icon="logo-youtube"
          title="YouTube внутри Sonar работает на телефоне"
          text="В браузере откройте его в отдельной вкладке."
          actionLabel="Открыть YouTube"
          onAction={() => void Linking.openURL(query ? searchUrl(query) : HOME)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="YouTube"
        subtitle="Официальный сайт · играет, пока Sonar открыт"
        right={
          <>
            <IconButton
              name="chevron-back"
              label="Назад на YouTube"
              disabled={!canGoBack}
              onPress={() => web.current?.goBack()}
            />
            <IconButton name="home-outline" label="Главная YouTube" onPress={() => go(HOME)} />
            <IconButton
              name="open-outline"
              label="Открыть в приложении YouTube"
              onPress={() => {
                pauseVideo();
                void Linking.openURL(currentUrl);
              }}
            />
          </>
        }
      />
      <View style={styles.frame}>
        <WebView
          ref={web}
          source={{ uri: initialUrl }}
          style={styles.web}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction
          domStorageEnabled
          setSupportMultipleWindows={false}
          injectedJavaScriptBeforeContentLoaded={WATCH_JS}
          startInLoadingState
          renderLoading={() => <ActivityIndicator color={colors.accent} style={StyleSheet.absoluteFill} />}
          onNavigationStateChange={(nav) => {
            setCanGoBack(nav.canGoBack);
            setCurrentUrl(nav.url);
          }}
          onShouldStartLoadWithRequest={(req) => {
            if (!/^https?:/i.test(req.url)) return false; // app intents such as intent:// stay unopened
            if (ALLOWED_HOST.test(hostOf(req.url))) return true;
            void Linking.openURL(req.url); // links out of YouTube open in the browser
            return false;
          }}
          onMessage={(e) => {
            const playing = e.nativeEvent.data === 'play';
            setVideoPlaying(playing);
            if (playing) TrackPlayer.pause();
          }}
        />
      </View>
      {focused && videoPlaying ? <StayAwake /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: colors.bg },
  web: { flex: 1, backgroundColor: colors.bg },
});
