// Pruebas de la lógica que decide si se pregunta, si se llama y a quién.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { estimateIntensity, surfaceDistanceKm } = require('../lib/core/geo');
const { toE164 } = require('../lib/core/phone');
const { entitlementFromSubscriber, isFirebaseUid, safeEqual } = require('../lib/core/entitlement');
const { planCheckin, shouldAsk, buildTwiml, smsMessage, ESCALATION_RULES } = require('../lib/core/escalation');
const { parseFeatures } = require('../lib/core/quakes');

test('distancia Cali–Bogotá ≈ 300 km', () => {
  const d = surfaceDistanceKm({ latitude: 3.4516, longitude: -76.532 }, { latitude: 4.711, longitude: -74.0721 });
  assert.ok(d > 290 && d < 320, `obtuve ${d}`);
});

test('intensidad: sismo fuerte cercano supera el umbral, uno lejano no', () => {
  assert.ok(estimateIntensity(6.0, 30, 20) >= ESCALATION_RULES.minIntensity);
  assert.ok(estimateIntensity(5.0, 300, 30) < ESCALATION_RULES.minIntensity);
  // Profundo (como Los Santos, ~150 km) se siente mucho menos.
  assert.ok(estimateIntensity(5.0, 10, 150) < estimateIntensity(5.0, 10, 10));
});

test('shouldAsk respeta magnitud, intensidad, antigüedad del sismo y de la ubicación', () => {
  const base = { magnitude: 5.5, intensity: 6, quakeAgeMs: 60_000, presenceAgeMs: 60_000 };
  assert.equal(shouldAsk(base), true);
  assert.equal(shouldAsk({ ...base, magnitude: 3.5 }), false);
  assert.equal(shouldAsk({ ...base, intensity: 4 }), false);
  assert.equal(shouldAsk({ ...base, quakeAgeMs: 30 * 60_000 }), false);
  assert.equal(shouldAsk({ ...base, presenceAgeMs: 13 * 3600_000 }), false);
});

test('planCheckin limita el tiempo entre 3 y 10 minutos y recuerda dos veces', () => {
  const now = 1_000_000;
  assert.equal(planCheckin(now, 1).deadline - now, 3 * 60_000);
  assert.equal(planCheckin(now, 30).deadline - now, 10 * 60_000);
  const plan = planCheckin(now, 6);
  assert.equal(plan.reminders.length, 2);
  assert.ok(plan.reminders[0] < plan.reminders[1] && plan.reminders[1] < plan.deadline);
});

test('teléfonos: completa +57, respeta +, rechaza basura y líneas de emergencia', () => {
  assert.equal(toE164('3001234567'), '+573001234567');
  assert.equal(toE164('573001234567'), '+573001234567');
  assert.equal(toE164('+14155550100'), '+14155550100');
  assert.equal(toE164('6012345678'), '+576012345678');
  assert.equal(toE164('123'), null);
  assert.equal(toE164('+123'), null);
  assert.equal(toE164('12345'), null);
  assert.equal(toE164(''), null);
});

test('entitlement: activo, vencido, de por vida y sin entitlement', () => {
  const now = new Date('2026-10-28T12:00:00Z');
  const active = entitlementFromSubscriber({
    subscriber: {
      entitlements: { premium: { expires_date: '2026-11-28T12:00:00Z', product_identifier: 'sismo_monthly' } },
      subscriptions: { sismo_monthly: { store: 'play_store', unsubscribe_detected_at: null } },
    },
  }, 'premium', now);
  assert.equal(active.premium, true);
  assert.equal(active.store, 'play_store');
  assert.equal(active.willRenew, true);

  const expired = entitlementFromSubscriber({
    subscriber: { entitlements: { premium: { expires_date: '2026-10-01T00:00:00Z' } } },
  }, 'premium', now);
  assert.equal(expired.premium, false);

  const lifetime = entitlementFromSubscriber({ subscriber: { entitlements: { premium: { expires_date: null } } } }, 'premium', now);
  assert.equal(lifetime.premium, true);

  assert.equal(entitlementFromSubscriber({ subscriber: { entitlements: {} } }, 'premium', now).premium, false);
  assert.equal(entitlementFromSubscriber({}, 'premium', now).premium, false);
  const garbage = entitlementFromSubscriber({ subscriber: { entitlements: { premium: { expires_date: 'nope' } } } }, 'premium', now);
  assert.equal(garbage.premium, false);
});

test('solo UIDs de Firebase, nunca IDs anónimos ni rutas', () => {
  assert.equal(isFirebaseUid('ySiRo09jM6U5iDabc123XYZ'), true);
  assert.equal(isFirebaseUid('$RCAnonymousID:abc'), false);
  assert.equal(isFirebaseUid('../users/x'), false);
  assert.equal(isFirebaseUid(undefined), false);
});

test('safeEqual compara secretos', () => {
  assert.equal(safeEqual('Bearer abc', 'Bearer abc'), true);
  assert.equal(safeEqual('Bearer abd', 'Bearer abc'), false);
  assert.equal(safeEqual('', 'x'), false);
});

test('TwiML escapa el contenido (sin inyección de etiquetas)', () => {
  const xml = buildTwiml({ name: 'Ana <Hangup/> & "x"', magnitude: 5.6, place: 'Cali' });
  assert.ok(!xml.includes('<Hangup/>'));
  assert.ok(xml.includes('&lt;Hangup/&gt;'));
  assert.ok(xml.includes('uno, dos, tres'));
  assert.equal((xml.match(/<Say /g) ?? []).length, 2);
});

test('SMS incluye ubicación y el 123 como recomendación', () => {
  const text = smsMessage({ name: 'Ana', magnitude: 5.6, place: 'Cali', mapsUrl: 'https://maps.google.com/?q=3.45,-76.53' });
  assert.match(text, /maps\.google\.com/);
  assert.match(text, /123/);
});

test('parseFeatures usa el mismo ID que la app y descarta datos incompletos', () => {
  const quakes = parseFeatures([
    { id: 'SGC2026abc', properties: { mag: 5.04, time: '2026-10-28T12:00:00Z', place: 'Dagua' }, geometry: { coordinates: [-76.6, 3.6, 30] } },
    { id: 'bad', properties: { mag: 'x' }, geometry: { coordinates: [0, 0] } },
  ], 'SGC');
  assert.equal(quakes.length, 1);
  assert.equal(quakes[0].id, 'sgc-SGC2026abc');
  assert.equal(quakes[0].magnitude, 5);
});
