import * as SMS from 'expo-sms';
import { Linking, Share } from 'react-native';
import { getLinkedPushToken } from '../services/safety';
import { Earthquake, TrustedContact, UserLocation } from '../types';
import { mapsLink } from './geo';
import { sendExpoPushNotification } from './notifications';

/** Línea única de emergencias de Colombia (policía, ambulancia, bomberos). */
export const EMERGENCY_NUMBER = '123';

export function callNumber(phone: string) {
  return Linking.openURL(`tel:${phone}`);
}

export function callEmergency() {
  return callNumber(EMERGENCY_NUMBER);
}

type MessageInput = {
  name: string;
  kind: 'help' | 'safe' | 'no-response';
  location?: UserLocation | null;
  earthquake?: Earthquake | null;
  drill?: boolean;
};

export function buildEmergencyMessage({ name, kind, location, earthquake, drill }: MessageInput) {
  const lines: string[] = [];
  if (drill) lines.push('[SIMULACRO - no es una emergencia real]');

  if (kind === 'safe') {
    lines.push(`${name} está bien después del sismo.`);
  } else if (kind === 'no-response') {
    lines.push(`${name} no respondió a SismoAlert después de un sismo fuerte. Por favor intenta comunicarte.`);
  } else {
    lines.push(`${name} necesita ayuda.`);
  }

  if (earthquake) {
    lines.push(`Sismo M${earthquake.magnitude.toFixed(1)} · ${earthquake.location}.`);
  }
  if (location) {
    lines.push(`Última ubicación: ${mapsLink(location.latitude, location.longitude)}`);
  }
  if (kind !== 'safe') {
    lines.push(`Si no logras contactarle, llama al ${EMERGENCY_NUMBER}.`);
  }
  return lines.join('\n');
}

/** Abre el editor de SMS con todos los contactos y el mensaje listo; la persona solo toca "Enviar". */
export async function textContacts(contacts: TrustedContact[], message: string) {
  const phones = contacts.map((contact) => contact.phone).filter(Boolean);
  if (phones.length > 0 && (await SMS.isAvailableAsync())) {
    await SMS.sendSMSAsync(phones, message);
    return;
  }
  await Share.share({ message });
}

export async function shareOnWhatsApp(message: string) {
  const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
  if (await Linking.canOpenURL(url)) {
    await Linking.openURL(url);
    return;
  }
  await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
}

export function shareMessage(message: string) {
  return Share.share({ message });
}

/**
 * Envía una notificación push a los contactos que también usan SismoAlert.
 * Devuelve cuántos contactos recibieron el aviso.
 */
export async function notifyLinkedContacts(
  contacts: TrustedContact[],
  title: string,
  body: string,
) {
  const linked = contacts.filter((contact) => contact.appEmail);
  const results = await Promise.all(
    linked.map(async (contact) => {
      const token = await getLinkedPushToken(contact.appEmail as string);
      if (!token) return false;
      try {
        await sendExpoPushNotification(token, title, body, { route: 'Seguridad', type: 'contact-alert' });
        return true;
      } catch {
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
}
