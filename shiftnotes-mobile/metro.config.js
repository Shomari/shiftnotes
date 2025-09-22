const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add CSS support for web builds
config.resolver.assetExts.push('css');

// Configure CSS handling for react-datepicker
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Handle CSS imports properly
config.resolver.platforms = ['native', 'web', 'ios', 'android'];

module.exports = config;
