const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add ttf to asset extensions
config.resolver.assetExts.push('ttf');

// Ensure sourceExts includes the necessary extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

// socket.io-client's package.json exports field points to ESM files that
// don't exist in the installed build; disable exports resolution so Metro
// falls back to traditional file-based resolution and finds the CJS build.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;