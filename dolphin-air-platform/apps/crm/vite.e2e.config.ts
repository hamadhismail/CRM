import { mergeConfig } from 'vite';
import baseConfig from './vite.config';

export default mergeConfig(baseConfig, {
  define: {
    // The isolated E2E bundle exercises only Firebase Auth Emulator endpoints.
    // The production build continues to use Vite's normal DEV=false behavior.
    'import.meta.env.DEV': 'true',
  },
});
