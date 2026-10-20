const DB_NAME = 'verity-local-first';
const DB_VERSION = 1;

export interface GuestIdentity {
  id: string;
  username: string;
  createdAt: string;
  lastSeenAt: string;
  accountType: 'guest';
}

interface LocalRecord<T> {
  id: string;
  ownerId: string;
  type: string;
  value: T;
  updatedAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('identities')) {
        db.createObjectStore('identities', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('records')) {
        const records = db.createObjectStore('records', { keyPath: 'id' });
        records.createIndex('by_owner_type', ['ownerId', 'type']);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }

  return openDatabase().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = run(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  }));
}

function generateGuestId(): string {
  const cryptoId = crypto.randomUUID?.();
  return `guest_${cryptoId ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
}

export const localDb = {
  getActiveIdentityId: () =>
    transaction<{ key: string; value: string } | undefined>('meta', 'readonly', store => store.get('activeIdentityId'))
      .then(row => row?.value ?? null),

  setActiveIdentityId: (value: string) =>
    transaction<IDBValidKey>('meta', 'readwrite', store => store.put({ key: 'activeIdentityId', value })),

  getIdentity: (id: string) =>
    transaction<GuestIdentity | undefined>('identities', 'readonly', store => store.get(id)),

  saveIdentity: (identity: GuestIdentity) =>
    transaction<IDBValidKey>('identities', 'readwrite', store => store.put(identity)),

  createGuestIdentity: async (username: string): Promise<GuestIdentity> => {
    const now = new Date().toISOString();
    const identity: GuestIdentity = {
      id: generateGuestId(),
      username: username.trim(),
      createdAt: now,
      lastSeenAt: now,
      accountType: 'guest',
    };

    await localDb.saveIdentity(identity);
    await localDb.setActiveIdentityId(identity.id);
    return identity;
  },

  touchIdentity: async (identity: GuestIdentity) => {
    const next = { ...identity, lastSeenAt: new Date().toISOString() };
    await localDb.saveIdentity(next);
    return next;
  },

  putRecord: <T>(record: LocalRecord<T>) =>
    transaction<IDBValidKey>('records', 'readwrite', store => store.put(record)),

  getRecord: <T>(id: string) =>
    transaction<LocalRecord<T> | undefined>('records', 'readonly', store => store.get(id)),
};
