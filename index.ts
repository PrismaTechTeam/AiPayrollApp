// ============================================================================
// CRITICAL DEBUG: This MUST run first - before any imports
// ============================================================================
console.log('🔥🔥🔥 INDEX.TS FILE LOADED 🔥🔥🔥');
console.log('Time:', new Date().toISOString());
console.log('File: index.ts');
console.log('This is the PAYROLL APP, not LetlinkMobile!');

import { registerRootComponent } from 'expo';
import Constants from 'expo-constants';
import App from './App';

// ============================================================================
// DEBUG: Log app configuration to see what Expo is trying to load
// ============================================================================
console.log('═══════════════════════════════════════════════════════════════');
console.log('🚀 [index.ts] APP ROOT INITIALIZATION');
console.log('═══════════════════════════════════════════════════════════════');

try {
  console.log('📱 [index.ts] Expo Constants:', {
    appOwnership: Constants.appOwnership,
    executionEnvironment: Constants.executionEnvironment,
    expoVersion: Constants.expoVersion,
    installationId: Constants.installationId,
    isDevice: Constants.isDevice,
    sessionId: Constants.sessionId,
  });
  
  console.log('📦 [index.ts] App Config:', {
    slug: Constants.expoConfig?.slug,
    name: Constants.expoConfig?.name,
    scheme: Constants.expoConfig?.scheme,
    owner: Constants.expoConfig?.owner,
    version: Constants.expoConfig?.version,
    iosBundleIdentifier: Constants.expoConfig?.ios?.bundleIdentifier,
    androidPackage: Constants.expoConfig?.android?.package,
  });
  
  console.log('🔍 [index.ts] Full expoConfig:', JSON.stringify(Constants.expoConfig, null, 2));
} catch (configError) {
  console.error('❌ [index.ts] Error reading config:', configError);
}

console.log('═══════════════════════════════════════════════════════════════');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
console.log('✅ [index.ts] Registering root component...');
try {
  registerRootComponent(App);
  console.log('✅ [index.ts] Root component registered successfully!');
  console.log('🔥🔥🔥 INDEX.TS COMPLETE 🔥🔥🔥');
} catch (registerError: any) {
  console.error('❌❌❌ ERROR REGISTERING ROOT COMPONENT ❌❌❌');
  console.error('Error:', registerError);
  console.error('Error message:', registerError?.message);
  console.error('Error stack:', registerError?.stack);
  throw registerError;
}
