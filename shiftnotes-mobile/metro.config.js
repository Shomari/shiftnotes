const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Set explicit project root
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Add CSS support for web builds
config.resolver.assetExts.push('css');

// Configure CSS handling for react-datepicker
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Handle CSS imports properly
config.resolver.platforms = ['native', 'web', 'ios', 'android'];

// Ensure node_modules resolution
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

module.exports = config;
