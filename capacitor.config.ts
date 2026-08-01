import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.askoo.app',
  appName: 'askoo',
  webDir: 'dist',
  plugins: {
    OtaKit: {
      appId: '0913f58f-4ccc-43b1-aee1-094ca3e984d1',
      appReadyTimeout: 10000,
      launchPolicy: 'apply-staged',
      resumePolicy: 'shadow',
      runtimePolicy: 'immediate',
    },
  },
};

export default config;
