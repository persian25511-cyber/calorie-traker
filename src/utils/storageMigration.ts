export const STORAGE_SCHEMA_VERSION = 2

export const STORAGE_KEYS = {
  schemaVersion: 'kalorishomar_schema_version',
  foods: 'kalorishomar_v2_foods',
  entries: 'kalorishomar_v2_entries',
  goals: 'kalorishomar_v2_goals',
  water: 'kalorishomar_v2_water',
  weights: 'kalorishomar_v2_weights',
  templates: 'kalorishomar_v2_templates',
  theme: 'kalorishomar_v2_theme',
  lastBackupAt: 'kalorishomar_v2_last_backup_at',
} as const

const LEGACY_V1_MAP: Array<[v1Key: string, v2Key: string]> = [
  ['kalorishomar_v1_foods', STORAGE_KEYS.foods],
  ['kalorishomar_v1_entries', STORAGE_KEYS.entries],
  ['kalorishomar_v1_goals', STORAGE_KEYS.goals],
  ['kalorishomar_v1_water', STORAGE_KEYS.water],
]

export interface StorageWriteResult {
  ok: boolean
  error?: string
}

/**
 * Safely migrates any existing v1 localStorage keys into v2 schema keys
 * without deleting legacy data until v2 write succeeds.
 */
export function runStorageMigrations(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null =
    typeof window !== 'undefined' ? window.localStorage : null,
): void {
  if (!storage) return
  try {
    const rawVersion = storage.getItem(STORAGE_KEYS.schemaVersion)
    const currentVersion = rawVersion ? Number(rawVersion) : 0
    if (currentVersion >= STORAGE_SCHEMA_VERSION) return

    for (const [v1Key, v2Key] of LEGACY_V1_MAP) {
      const existingV2 = storage.getItem(v2Key)
      const legacyV1 = storage.getItem(v1Key)
      if (!existingV2 && legacyV1) {
        storage.setItem(v2Key, legacyV1)
      }
    }

    storage.setItem(STORAGE_KEYS.schemaVersion, String(STORAGE_SCHEMA_VERSION))
  } catch {
    // Migration error will be surfaced on next write if storage is locked/full
  }
}

export function readStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStorageJson<T>(key: string, value: T): StorageWriteResult {
  if (typeof window === 'undefined') return { ok: true }
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch (err) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22)
    return {
      ok: false,
      error: isQuota
        ? 'فضای ذخیره‌سازی مرورگر پر شده است! لطفاً فوراً یک فایل پشتیبان JSON دانلود کنید و برخی داده‌های قدیمی را پاک کنید.'
        : 'امکان ذخیره تغییرات در حافظه مرورگر وجود ندارد (ممکن است در حالت ناشناس/Private باشید). لطفاً پشتیبان JSON تهیه کنید.',
    }
  }
}

/** Requests durable/persistent browser storage so OS does not evict offline data under pressure. */
export async function requestPersistentStorage(): Promise<'persisted' | 'not_persisted' | 'unsupported'> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return 'unsupported'
  }
  try {
    const already = navigator.storage.persisted ? await navigator.storage.persisted() : false
    if (already) return 'persisted'
    const granted = await navigator.storage.persist()
    return granted ? 'persisted' : 'not_persisted'
  } catch {
    return 'unsupported'
  }
}
