const fs = require('node:fs');
const path = require('node:path');

const appJson = require('./app.json').expo;

module.exports = ({ config }) => {
  const expoConfig = { ...config, ...appJson };
  const androidServicesFile = './google-services.json';
  const iosServicesFile = './GoogleService-Info.plist';

  if (fs.existsSync(path.resolve(__dirname, androidServicesFile))) {
    expoConfig.android = {
      ...expoConfig.android,
      googleServicesFile: androidServicesFile,
    };
  }

  if (fs.existsSync(path.resolve(__dirname, iosServicesFile))) {
    expoConfig.ios = {
      ...expoConfig.ios,
      googleServicesFile: iosServicesFile,
    };
  }

  return expoConfig;
};