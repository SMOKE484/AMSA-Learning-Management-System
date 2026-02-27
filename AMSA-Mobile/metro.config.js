const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add ttf to asset extensions
config.resolver.assetExts.push('ttf');

// Ensure sourceExts includes the necessary extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;