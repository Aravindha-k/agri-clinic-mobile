module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"]
    // Reanimated 4: babel-preset-expo adds react-native-worklets/plugin when installed.
    // Do not add react-native-reanimated/plugin here — double transform breaks release animations.
  };
};
