import { NativeModules, TurboModuleRegistry } from 'react-native';

/**
 * ¿Este binario incluye el módulo nativo? En Expo Go no están AdMob ni otros
 * módulos de terceros; importarlos sin comprobar haría que la app se cierre.
 */
export function hasNativeModule(name: string) {
  try {
    return Boolean(TurboModuleRegistry.get(name) ?? (NativeModules as Record<string, unknown>)[name]);
  } catch {
    return false;
  }
}
