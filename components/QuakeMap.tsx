import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { magnitudeColor } from '../lib/magnitude';
import { colors, radius } from '../theme';
import { Earthquake } from '../types';

type UserMarker = { latitude: number; longitude: number; radiusKm: number };

type QuakeMapProps = {
  earthquakes: Earthquake[];
  onSelect: (id: string) => void;
  /** Ubicación del usuario: se dibuja con su radio de alerta. */
  user?: UserMarker;
};

// Centro aproximado de Colombia.
const DEFAULT_CENTER = [4.6, -74.1];

function buildHtml(earthquakes: Earthquake[], user?: UserMarker) {
  const markers = earthquakes
    .filter((item) => item.latitude !== undefined && item.longitude !== undefined)
    .map((item) => ({
      id: item.id,
      lat: item.latitude,
      lng: item.longitude,
      mag: item.magnitude,
      label: `${item.magnitude.toFixed(1)} · ${item.location}`,
      color: magnitudeColor(item.magnitude),
    }));
  const data = JSON.stringify(markers).replace(/</g, '\\u003c');
  const me = JSON.stringify(user ?? null);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; background: ${colors.background}; }
  .leaflet-container { font-family: sans-serif; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var data = ${data};
  var map = L.map('map', { zoomControl: true }).setView([${DEFAULT_CENTER[0]}, ${DEFAULT_CENTER[1]}], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);
  var points = [];
  data.forEach(function (item) {
    var marker = L.circleMarker([item.lat, item.lng], {
      radius: Math.max(5, item.mag * 2.5),
      color: item.color,
      fillColor: item.color,
      fillOpacity: 0.55,
      weight: 2
    }).addTo(map);
    var tip = document.createElement('div');
    tip.textContent = item.label;
    marker.bindTooltip(tip);
    marker.on('click', function () {
      window.ReactNativeWebView.postMessage(item.id);
    });
    points.push([item.lat, item.lng]);
  });
  var me = ${me};
  if (me) {
    L.circle([me.latitude, me.longitude], {
      radius: me.radiusKm * 1000,
      color: '${colors.accent}',
      weight: 1,
      fillColor: '${colors.accent}',
      fillOpacity: 0.06,
      dashArray: '4 6'
    }).addTo(map);
    L.circleMarker([me.latitude, me.longitude], {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: '#38BDF8',
      fillOpacity: 1
    }).addTo(map).bindTooltip('Tú estás aquí');
  }
  if (points.length > 1) {
    map.fitBounds(points, { padding: [24, 24], maxZoom: 8 });
  }
</script>
</body>
</html>`;
}

export function QuakeMap({ earthquakes, onSelect, user }: QuakeMapProps) {
  const lat = user?.latitude;
  const lng = user?.longitude;
  const radiusKm = user?.radiusKm;
  // Solo se reconstruye el mapa si cambian los sismos o la ubicación (no en cada render).
  const html = useMemo(
    () =>
      buildHtml(
        earthquakes,
        lat !== undefined && lng !== undefined && radiusKm !== undefined
          ? { latitude: lat, longitude: lng, radiusKm }
          : undefined,
      ),
    [earthquakes, lat, lng, radiusKm],
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    onSelect(event.nativeEvent.data);
  };

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://localhost' }}
        onMessage={handleMessage}
        javaScriptEnabled
        style={styles.map}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 320,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  map: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
