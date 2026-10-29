import { logger } from 'firebase-functions';

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  from: string;
  dryRun: boolean;
};

export type TwilioResult = { ok: boolean; sid?: string; error?: string; dryRun?: boolean };

async function post(config: TwilioConfig, resource: 'Calls' | 'Messages', body: Record<string, string>) {
  if (config.dryRun) {
    logger.info(`[Twilio simulado] ${resource}`, { to: body.To });
    return { ok: true, dryRun: true } satisfies TwilioResult;
  }
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/${resource}.json`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body).toString(),
        signal: AbortSignal.timeout(15000),
      },
    );
    const json = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!response.ok) {
      return { ok: false, error: json.message ?? `HTTP ${response.status}` } satisfies TwilioResult;
    }
    return { ok: true, sid: json.sid } satisfies TwilioResult;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) } satisfies TwilioResult;
  }
}

/** Llamada de voz con un mensaje leído (TwiML). Nunca se usa con números de emergencia. */
export function placeCall(config: TwilioConfig, to: string, twiml: string) {
  return post(config, 'Calls', { To: to, From: config.from, Twiml: twiml, Timeout: '30' });
}

export function sendSms(config: TwilioConfig, to: string, text: string) {
  return post(config, 'Messages', { To: to, From: config.from, Body: text });
}
