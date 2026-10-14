import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNavigationContainerRef,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { runEarthquakeSync } from '../hooks/useEarthquakeSync';
import { AlertsScreen } from '../screens/AlertsScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { GuideScreen } from '../screens/GuideScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { RecentScreen } from '../screens/RecentScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme';
import { RootTabParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.tabBar,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

// Sincroniza los sismos reales con Firestore al abrir la sesión.
function EarthquakeSyncBridge() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      runEarthquakeSync();
    }
  }, [user]);

  return null;
}

export function AppNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <EarthquakeSyncBridge />
      <Tab.Navigator
        initialRouteName="Inicio"
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            height: 64 + insets.bottom,
            paddingTop: 6,
            paddingBottom: 8 + insets.bottom,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Inicio"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Sismos"
          component={RecentScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Mapa"
          component={MapScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Alertas"
          component={AlertsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Guia"
          component={GuideScreen}
          options={{
            title: 'Guía',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="medkit" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Detalle"
          component={DetailScreen}
          options={{ tabBarItemStyle: { display: 'none' } }}
        />
        <Tab.Screen
          name="Contactos"
          component={ContactsScreen}
          options={{ tabBarItemStyle: { display: 'none' } }}
        />
        <Tab.Screen
          name="Configuracion"
          component={SettingsScreen}
          options={{
            title: 'Configuración',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
