import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';

// Public Mapbox token, injected at build time via EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
// (see .env.example). It's safe to ship in the client bundle — restrict it to your
// app's URL/bundle ID in the Mapbox dashboard rather than treating it as a secret.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

export default function App() {
  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map}>
        <Mapbox.Camera zoomLevel={12} centerCoordinate={[-122.4194, 37.7749]} />
        <Mapbox.LocationPuck puckBearingEnabled puckBearing="heading" />
      </Mapbox.MapView>
      <Text style={styles.caption}>Trail Challenge App</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  caption: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
  },
});
