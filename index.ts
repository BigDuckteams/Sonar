import { registerRootComponent } from 'expo';

import App from './App';
import { registerSession } from './src/player/session';

// The playback session must be registered before the root component, so playback
// keeps working (and stays controllable from the lock screen) without the UI.
registerSession();
registerRootComponent(App);
