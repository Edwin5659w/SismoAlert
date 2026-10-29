import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafety } from '../../context/SafetyContext';
import {
  EMERGENCY_NUMBER,
  callEmergency,
  notifyLinkedContacts,
  shareMessage,
  shareOnWhatsApp,
  textContacts,
} from '../../lib/emergency';
import { colors, radius, spacing } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

function ActionTile({
  icon,
  title,
  caption,
  onPress,
  tint = colors.accent,
  busy = false,
}: {
  icon: IconName;
  title: string;
  caption: string;
  onPress: () => void;
  tint?: string;
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.tileIcon, { backgroundColor: `${tint}22` }]}>
        {busy ? <ActivityIndicator color={tint} /> : <Ionicons name={icon} size={20} color={tint} />}
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileCaption}>{caption}</Text>
    </Pressable>
  );
}

type EmergencyActionsProps = {
  kind: 'help' | 'no-response';
};

/** Acciones de emergencia: llamar al 123, avisar a contactos y compartir ubicación. */
export function EmergencyActions({ kind }: EmergencyActionsProps) {
  const { contacts, helpMessage, userName, location } = useSafety();
  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState('');
  const linked = contacts.filter((contact) => contact.appEmail).length;
  const message = helpMessage(kind);

  const pushToLinked = async () => {
    setNotifying(true);
    setNotifyResult('');
    try {
      const count = await notifyLinkedContacts(contacts, `${userName} necesita ayuda`, message);
      setNotifyResult(
        count > 0
          ? `Aviso enviado a ${count} contacto${count === 1 ? '' : 's'} con SismoAlert.`
          : 'Ningún contacto vinculado pudo recibir el aviso.',
      );
    } finally {
      setNotifying(false);
    }
  };

  return (
    <View>
      <Pressable
        onPress={callEmergency}
        style={({ pressed }) => [styles.call, pressed && styles.callPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Llamar al ${EMERGENCY_NUMBER}`}
      >
        <Ionicons name="call" size={24} color="#fff" />
        <View>
          <Text style={styles.callTitle}>Llamar al {EMERGENCY_NUMBER}</Text>
          <Text style={styles.callCaption}>Policía, ambulancia y bomberos</Text>
        </View>
      </Pressable>

      <View style={styles.grid}>
        <ActionTile
          icon="chatbubbles"
          title="SMS a contactos"
          caption={contacts.length ? `${contacts.length} con tu ubicación` : 'Agrega contactos'}
          onPress={() => textContacts(contacts, message)}
        />
        <ActionTile
          icon="logo-whatsapp"
          title="WhatsApp"
          caption="Mensaje con ubicación"
          tint={colors.success}
          onPress={() => shareOnWhatsApp(message)}
        />
        <ActionTile
          icon="notifications"
          title="Avisar con la app"
          caption={linked ? `${linked} contacto${linked === 1 ? '' : 's'} vinculado${linked === 1 ? '' : 's'}` : 'Sin contactos vinculados'}
          tint={colors.warning}
          busy={notifying}
          onPress={pushToLinked}
        />
        <ActionTile
          icon="share-social"
          title="Compartir"
          caption={location.location ? 'Ubicación y mensaje' : 'Mensaje de ayuda'}
          onPress={() => shareMessage(message)}
        />
      </View>
      {notifyResult ? <Text style={styles.result}>{notifyResult}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.danger,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  callPressed: {
    backgroundColor: '#E11D48',
  },
  callTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  callCaption: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tile: {
    width: '48.5%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tilePressed: {
    backgroundColor: colors.surface,
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tileTitle: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: '700',
  },
  tileCaption: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  result: {
    color: colors.muted,
    fontSize: 12.5,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
