import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.belgianmakshkheenhub',
  appName: 'Makshkheen Hub',
  webDir: 'dist',
  server: {
    url: 'https://277dd843-618e-46cd-bcdc-cc84870532b3.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#0A0A0A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
