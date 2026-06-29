import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.b2blaw.app',
  appName: 'B2B-LAW',
  webDir: 'dist/capacitor',
  server: {
    androidScheme: 'https',
    cleartext: true,
    hostname: 'localhost'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#050A15',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark'
    }
  }
}

export default config
