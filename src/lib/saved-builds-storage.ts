export type SavedBuildPersistenceState = 'best-effort' | 'persistent' | 'unavailable' | 'unknown'

export type SavedBuildRecord = {
  createdAt: string
  id: string
  name: string
  pickedPerkIds: string[]
  referenceVersion: string
  schemaVersion: 1
  updatedAt: string
}

const savedBuildsDatabaseName = 'battle-brothers-legends-browser'
const savedBuildsDatabaseVersion = 1
const savedBuildsStoreName = 'saved-builds'
const savedBuildSchemaVersion = 1
const maximumSavedBuildNameLength = 80
const maximumSavedBuildPerkCount = 500

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/gu, ' ')
}

function createFallbackSavedBuildId(): string {
  return `saved-build-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function createSavedBuildId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return createFallbackSavedBuildId()
}

function normalizeSavedBuildName(name: string): string {
  const normalizedName = collapseWhitespace(name).slice(0, maximumSavedBuildNameLength)

  return normalizedName.length > 0 ? normalizedName : 'Untitled build'
}

function normalizePickedPerkIds(pickedPerkIds: unknown): string[] {
  if (!Array.isArray(pickedPerkIds)) {
    return []
  }

  const uniquePickedPerkIds = new Set<string>()

  for (const pickedPerkId of pickedPerkIds) {
    if (typeof pickedPerkId !== 'string') {
      continue
    }

    const normalizedPickedPerkId = pickedPerkId.trim()

    if (normalizedPickedPerkId.length === 0) {
      continue
    }

    uniquePickedPerkIds.add(normalizedPickedPerkId)

    if (uniquePickedPerkIds.size >= maximumSavedBuildPerkCount) {
      break
    }
  }

  return [...uniquePickedPerkIds]
}

function isValidDateString(value: string): boolean {
  return Number.isFinite(Date.parse(value))
}

function getSavedBuildStringProperty(
  value: Record<string, unknown>,
  key: keyof SavedBuildRecord,
): string | null {
  const propertyValue = value[key]

  return typeof propertyValue === 'string' && propertyValue.trim().length > 0
    ? collapseWhitespace(propertyValue)
    : null
}

function createIndexedDbRequestPromise<Result>(request: IDBRequest<Result>): Promise<Result> {
  return new Promise((resolve, reject) => {
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed.'))
    }
    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

function createIndexedDbTransactionPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'))
    }
    transaction.oncomplete = () => {
      resolve()
    }
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
    }
  })
}

function openSavedBuildsDatabase(): Promise<IDBDatabase> {
  const indexedDatabase = globalThis.indexedDB

  if (!indexedDatabase) {
    return Promise.reject(new Error('IndexedDB is unavailable.'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDatabase.open(savedBuildsDatabaseName, savedBuildsDatabaseVersion)

    request.onerror = () => {
      reject(request.error ?? new Error('Saved builds database could not be opened.'))
    }
    request.onblocked = () => {
      reject(
        new Error('Saved builds database upgrade was blocked. Close other tabs and try again.'),
      )
    }
    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(savedBuildsStoreName)) {
        const savedBuildsStore = database.createObjectStore(savedBuildsStoreName, {
          keyPath: 'id',
        })
        savedBuildsStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }
    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

export function createSavedBuildRecord({
  id = createSavedBuildId(),
  name,
  now = new Date(),
  pickedPerkIds,
  referenceVersion,
}: {
  id?: string
  name: string
  now?: Date
  pickedPerkIds: string[]
  referenceVersion: string
}): SavedBuildRecord {
  const normalizedPickedPerkIds = normalizePickedPerkIds(pickedPerkIds)

  if (normalizedPickedPerkIds.length === 0) {
    throw new Error('A saved build needs at least one perk.')
  }

  const savedAt = now.toISOString()

  return {
    createdAt: savedAt,
    id,
    name: normalizeSavedBuildName(name),
    pickedPerkIds: normalizedPickedPerkIds,
    referenceVersion,
    schemaVersion: savedBuildSchemaVersion,
    updatedAt: savedAt,
  }
}

export function readSavedBuildRecord(value: unknown): SavedBuildRecord | null {
  if (value === null || typeof value !== 'object') {
    return null
  }

  const savedBuild = value as Record<string, unknown>

  if (savedBuild.schemaVersion !== savedBuildSchemaVersion) {
    return null
  }

  const id = getSavedBuildStringProperty(savedBuild, 'id')
  const createdAt = getSavedBuildStringProperty(savedBuild, 'createdAt')
  const updatedAt = getSavedBuildStringProperty(savedBuild, 'updatedAt')
  const referenceVersion = getSavedBuildStringProperty(savedBuild, 'referenceVersion')

  if (
    id === null ||
    createdAt === null ||
    updatedAt === null ||
    referenceVersion === null ||
    !isValidDateString(createdAt) ||
    !isValidDateString(updatedAt)
  ) {
    return null
  }

  const pickedPerkIds = normalizePickedPerkIds(savedBuild.pickedPerkIds)

  if (pickedPerkIds.length === 0) {
    return null
  }

  return {
    createdAt,
    id,
    name: normalizeSavedBuildName(
      typeof savedBuild.name === 'string' ? savedBuild.name : 'Untitled build',
    ),
    pickedPerkIds,
    referenceVersion,
    schemaVersion: savedBuildSchemaVersion,
    updatedAt,
  }
}

export function sortSavedBuildRecords(savedBuilds: SavedBuildRecord[]): SavedBuildRecord[] {
  return [...savedBuilds].toSorted((leftSavedBuild, rightSavedBuild) => {
    const updatedAtComparison = rightSavedBuild.updatedAt.localeCompare(leftSavedBuild.updatedAt)

    if (updatedAtComparison !== 0) {
      return updatedAtComparison
    }

    return leftSavedBuild.name.localeCompare(rightSavedBuild.name)
  })
}

export async function listSavedBuildRecords(): Promise<SavedBuildRecord[]> {
  const database = await openSavedBuildsDatabase()

  try {
    const transaction = database.transaction(savedBuildsStoreName, 'readonly')
    const request = transaction.objectStore(savedBuildsStoreName).getAll()
    const records = await createIndexedDbRequestPromise<unknown[]>(request)
    await createIndexedDbTransactionPromise(transaction)

    return sortSavedBuildRecords(records.flatMap((record) => readSavedBuildRecord(record) ?? []))
  } finally {
    database.close()
  }
}

export async function saveSavedBuildRecord(savedBuild: SavedBuildRecord): Promise<void> {
  const database = await openSavedBuildsDatabase()

  try {
    const transaction = database.transaction(savedBuildsStoreName, 'readwrite')
    const request = transaction.objectStore(savedBuildsStoreName).put(savedBuild)
    await createIndexedDbRequestPromise(request)
    await createIndexedDbTransactionPromise(transaction)
  } finally {
    database.close()
  }
}

export async function deleteSavedBuildRecord(savedBuildId: string): Promise<void> {
  const database = await openSavedBuildsDatabase()

  try {
    const transaction = database.transaction(savedBuildsStoreName, 'readwrite')
    const request = transaction.objectStore(savedBuildsStoreName).delete(savedBuildId)
    await createIndexedDbRequestPromise(request)
    await createIndexedDbTransactionPromise(transaction)
  } finally {
    database.close()
  }
}

export async function getSavedBuildPersistenceState(): Promise<SavedBuildPersistenceState> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return 'unavailable'
  }

  try {
    return (await navigator.storage.persisted()) ? 'persistent' : 'best-effort'
  } catch {
    return 'unknown'
  }
}

export async function requestSavedBuildPersistence(): Promise<SavedBuildPersistenceState> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return 'unavailable'
  }

  try {
    if (await navigator.storage.persisted()) {
      return 'persistent'
    }

    if (!navigator.storage.persist) {
      return 'best-effort'
    }

    return (await navigator.storage.persist()) ? 'persistent' : 'best-effort'
  } catch {
    return 'unknown'
  }
}
