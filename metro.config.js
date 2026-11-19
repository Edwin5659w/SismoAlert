const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('cjs');

// El código del servidor (carpeta functions/ en la raíz) no forma parte de la app móvil.
const serverDir = path.join(__dirname, 'functions').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [new RegExp(`^${serverDir}[\\/\\\\].*`)];

module.exports = config;
