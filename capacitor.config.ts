import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.askoo.app',
  appName: 'askoo',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      apiKey: 'b26f2657-1fee-4d3b-82a8-e4ce3d9bcc76',
      defaultChannel: 'production',
    },
  },
};

export default config;
