Sonar is an Android-first Expo / React Native music player (TypeScript, New Architecture). Prioritize mobile-first patterns and performance.

## Expo changes fast — verify before using an API

Before writing code that touches an Expo, EAS or React Native API, check the major version of `expo` in `package.json` and read the matching docs: `https://docs.expo.dev/versions/v<major>.0.0/` (index with corrections: https://docs.expo.dev/llms.txt). For `expo-media-library` in particular, SDK 58 exports the new object API (`Query`, `Asset`, `Album`), not the legacy `getAssetsAsync`.

## Commands

```bash
npm start                   # dev server (web preview on http://localhost:8081)
npm run typecheck           # tsc --noEmit — run before declaring any task done
npx expo install <package>  # use instead of npm add for Expo-compatible versions
npx expo-doctor             # diagnose dependency/config problems
npx eas-cli@latest build --platform android --profile preview   # APK in the cloud
```

## Structure

- `index.ts` — entry: registers the playback session, then the root component.
- `App.tsx` — React Navigation (native stack over bottom tabs); the mini player lives in the custom tab bar.
- `src/player/` — `engine.ts` (queue/playback helpers over `@rntp/player`), `session.ts` (playback-critical listeners), `hooks.ts`.
- `src/sources/` — `audius.ts` (full tracks), `itunes.ts` (30 s previews), `device.ts` (audio files on the phone via `expo-media-library`).
- `src/store/` — zustand: `library.ts` (favorites, playlists, history, settings; persisted in AsyncStorage), `device.ts` (scan state).
- `src/screens/`, `src/components/`, `src/ui/` (sheets, prompt, toast hosts mounted in `App.tsx`).
- `scripts/make-icons.js` — regenerates the icons in `assets/`.

## Rules

- Navigation is **React Navigation**, not Expo Router. Typed param lists are in `src/types.ts`; use `useRootNav` / `useTabNav` from `src/nav.ts`.
- The native player owns the queue. Next/previous, lock-screen and notification controls run natively; do not duplicate queue state in JS. Tracks travel in `MediaItem.extras.track`.
- `src/player/session.ts` and everything it imports must stay free of UI imports (it runs when the UI is gone).
- Data from the network is untrusted: render it as text only.
- `@rntp/player` is native code: Expo Go cannot run it, a development/preview build is required. `shaka-player` is a dev dependency only for the web preview.
- Do not edit generated `ios/` and `android/` folders by hand; configure native behaviour in `app.json` and config plugins.
- `@rntp/player` is free for personal non-commercial use only; publishing the app needs its commercial license.
