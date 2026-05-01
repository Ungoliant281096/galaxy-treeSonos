import { openDB } from 'idb';

const DB_NAME  = 'galaxy-offline';
const DB_VER   = 1;
const STORE    = 'dictamenes_pendientes';

let _db;

async function getDb() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VER, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: '_id' });
      }
    },
  });
  return _db;
}

export async function guardarOffline(dictamen) {
  const db = await getDb();
  await db.put(STORE, { ...dictamen, _pendiente: true, _ts: Date.now() });
}

export async function obtenerPendientes() {
  const db = await getDb();
  return db.getAll(STORE);
}

export async function eliminarPendiente(id) {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function contarPendientes() {
  const db = await getDb();
  return db.count(STORE);
}
