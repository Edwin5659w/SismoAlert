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
import { MedicalScreen } from '../screens/MedicalScreen';
import { PreparednessScreen } from '../screens/PreparednessScreen';
import { RecentScreen } from '../screens/RecentScreen';
import { SafetyScreen } from '../screens/SafetyScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TrustedContactsScreen } from '../screens/TrustedContactsScreen';
import { colors } from '../theme';
import { RootTabParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const hidden = { tabBarItemStyle: { display: 'none' as const } };

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
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Sismos"
          component={RecentScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Mapa"
          component={MapScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Seguridad"
          component={SafetyScreen}
          options={{
            tabBarActiveTintColor: colors.danger,
            tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Configuracion"
          component={SettingsScreen}
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
          }}
        />
        {/* Pantallas secundarias: no aparecen en la barra inferior. */}
        <Tab.Screen name="Alertas" component={AlertsScreen} options={hidden} />
        <Tab.Screen name="Guia" component={GuideScreen} options={{ ...hidden, title: 'Guía' }} />
        <Tab.Screen name="Detalle" component={DetailScreen} options={hidden} />
        <Tab.Screen name="Contactos" component={ContactsScreen} options={hidden} />
        <Tab.Screen name="ContactosConfianza" component={TrustedContactsScreen} options={hidden} />
        <Tab.Screen name="FichaMedica" component={MedicalScreen} options={hidden} />
        <Tab.Screen name="Preparacion" component={PreparednessScreen} options={hidden} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
