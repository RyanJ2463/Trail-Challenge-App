const { withAndroidManifest } = require('expo/config-plugins');

const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';

// react-native-health-connect's own config plugin wires up the permission-rationale
// activity, but package visibility on Android 11+ (API 30+) also requires a <queries>
// entry so the app can detect whether the Health Connect app is installed. Neither
// Expo's app.json schema nor the library's plugin exposes a field for this, so it's
// added here directly.
const withHealthConnectQueries = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest.queries) {
      manifest.queries = [{}];
    }
    const queries = manifest.queries[0];

    if (!queries.package) {
      queries.package = [];
    }
    const alreadyDeclared = queries.package.some(
      (entry) => entry.$?.['android:name'] === HEALTH_CONNECT_PACKAGE
    );
    if (!alreadyDeclared) {
      queries.package.push({ $: { 'android:name': HEALTH_CONNECT_PACKAGE } });
    }

    return config;
  });

module.exports = withHealthConnectQueries;
