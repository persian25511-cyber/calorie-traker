/**
 * Lightweight zero-dependency IndexedDB key-value adapter preparing KaloriShomar
 * for multi-year meal histories beyond localStorage's ~5MB synchronous ceiling.
 *
 * Current stage (Phase 0/1): Asynchronous non-blocking mirror + migration utility
 * alongside synchronous localStorage primary reads (see `docs/STORAGE_ROADMAP.md`).
 */
const IDB_NAME = 'kalorishomar_db'
const IDB_VERSION = 1
const STORE_NAME = 'kv'

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function idbSet<T>(key: string, value: T): Promise<boolean> {
  const db = await openDatabase()
  if (!db) return false
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(value, key)
      tx.oncomplete = () => {
        db.close()
        resolve(true)
      }
      tx.onerror = () => {
        db.close()
        resolve(false)
      }
    } catch {
      db.close()
      resolve(false)
    }
  })
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase()
  if (!db) return undefined
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => {
        db.close()
        resolve(req.result as T | undefined)
      }
      req.onerror = () => {
        db.close()
        resolve(undefined)
      }
    } catch {
      db.close()
      resolve(undefined)
    }
  })
}

export async function idbClearAll(): Promise<boolean> {
  const db = await openDatabase()
  if (!db) return false
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).clear()
      tx.oncomplete = () => {
        db.close()
        resolve(true)
      }
      tx.onerror = () => {
        db.close()
        resolve(false)
      }
    } catch {
      db.close()
      resolve(false)
    }
  })
}
