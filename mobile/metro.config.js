const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Fix for Connect middleware handle issue in RN 0.76+
        if (middleware && typeof middleware === 'function') {
          return middleware(req, res, next);
        }
        return next();
      };
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);