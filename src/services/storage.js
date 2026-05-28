import { openDB } from 'idb';

const DB_NAME = 'trippal';
const DB_VERSION = 2;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldV) {
      if (!db.objectStoreNames.contains('trips')) {
        const store = db.createObjectStore('trips', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('spending')) {
        const s = db.createObjectStore('spending', { keyPath: 'id' });
        s.createIndex('tripId', 'tripId');
        s.createIndex('createdAt', 'createdAt');
      }
    },
  });
}

// ── Trips ──
export async function saveTrip(trip) {
  const db = await getDB();
  const t = { ...trip, updatedAt: Date.now() };
  if (!t.createdAt) t.createdAt = Date.now();
  await db.put('trips', t);
  return t;
}

export async function getTrips() {
  const db = await getDB();
  return (await db.getAll('trips')).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getTrip(id) {
  return (await getDB()).get('trips', Number(id));
}

export async function deleteTrip(id) {
  await (await getDB()).delete('trips', Number(id));
}

// ── Spending ──
export async function saveSpending(record) {
  const db = await getDB();
  const r = { ...record, id: record.id || Date.now(), createdAt: record.createdAt || Date.now() };
  await db.put('spending', r);
  return r;
}

export async function getSpendingByTrip(tripId) {
  const db = await getDB();
  const all = await db.getAllFromIndex('spending', 'tripId', Number(tripId));
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSpending(id) {
  await (await getDB()).delete('spending', Number(id));
}

// ── Preferences ──
export async function savePreferences(prefs) {
  localStorage.setItem('trippal_prefs', JSON.stringify(prefs));
}

export async function getPreferences() {
  try { return JSON.parse(localStorage.getItem('trippal_prefs') || '{}'); }
  catch { return {}; }
}

// ── API Keys ──
export function getApiKeys() {
  try { return JSON.parse(localStorage.getItem('trippal_keys') || '{}'); }
  catch { return {}; }
}

export function saveApiKeys(keys) {
  localStorage.setItem('trippal_keys', JSON.stringify(keys));
}
