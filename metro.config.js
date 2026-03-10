const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add NativeWind support
config.resolver.sourceExts.push('css');

// Configure resolver to handle libphonenumber-js ES modules and JSON files
config.resolver.sourceExts.push('mjs', 'cjs', 'json');

// Remove JSON from assetExts so it can be required as a module
// This is needed for libphonenumber-js metadata files
if (config.resolver.assetExts) {
  config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'json');
}

// Add libphonenumber-js to transformIgnorePatterns to ensure it gets transformed
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
