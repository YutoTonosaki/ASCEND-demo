const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, "glb"])];
config.resolver.resolveRequest =
  require("./tools/three-resolution.cjs").resolveRequest;
module.exports = config;
