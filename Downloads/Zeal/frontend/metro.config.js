const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const aliasMap = {
  '@': path.resolve(__dirname),
  '@/components': path.resolve(__dirname, 'components'),
  '@/app': path.resolve(__dirname, 'app'),
  '@/hooks': path.resolve(__dirname, 'hooks'),
  '@/assets': path.resolve(__dirname, 'assets'),
  '@/services': path.resolve(__dirname, 'services'),
  '@/config': path.resolve(__dirname, 'config'),
  '@/constants': path.resolve(__dirname, 'constants'),
};

config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (target, name) => {
      if (aliasMap.hasOwnProperty(name)) {
        return aliasMap[name];
      }
      return path.join(__dirname, `node_modules/${name}`);
    },
  }
);

module.exports = config;
