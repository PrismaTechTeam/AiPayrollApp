const path = require('path');
const dotenv = require('dotenv');

// Load .env from app root
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Read the static app.json
const appJson = require('./app.json');

module.exports = () => {
  const config = { ...appJson.expo };

  // Merge Firebase env vars into extra so Constants.expoConfig.extra has them
  config.extra = {
    ...config.extra,
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
    // API URL — set via EAS env var or .env for builds
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || '',
    EXPO_PUBLIC_WEBSOCKET_URL: process.env.EXPO_PUBLIC_WEBSOCKET_URL || '',
  };

  return config;
};
