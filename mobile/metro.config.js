const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration with Connect middleware fix
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  server: {
    enhanceMiddleware: (middleware, metroServer) => {
      return (req, res, next) => {
        // Skip undefined middleware that causes Connect handle error
        if (!middleware || typeof middleware !== 'function') {
          return next();
        }
        return middleware(req, res, next);
      };
    },
  },
  // Additional stability fixes
  resolver: {
    unstable_enableSymlinks: false,
  },
  watchFolders: [],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);