import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { refreshEntitlement, revenuecatWebhook } from './handlers/monetization';
export { checkinTick, quakeWatcher } from './handlers/safety';
