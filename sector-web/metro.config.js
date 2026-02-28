const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Исключаем Node.js версию axios из бандла
config.resolver.blockList = [
  /node_modules\/axios\/dist\/node/,
];

// Добавляем резолвер для Node.js модулей
const defaultResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Полифиллы для Node.js модулей в React Native
  if (moduleName === "crypto") {
    return {
      filePath: require.resolve("react-native-get-random-values"),
      type: "sourceFile",
    };
  }
  
  // Используем стандартный резолвер
  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
