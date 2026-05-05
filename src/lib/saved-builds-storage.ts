import type { CategoryFilterMode } from './category-filter-state'
import { baselineBackgroundVeteranPerkLevelIntervals } from './background-veteran-perks'

export type SavedBuildPersistenceState = 'best-effort' | 'persistent' | 'unavailable' | 'unknown'

export type SavedBuildPlannerFilters = {
  categoryFilterMode: CategoryFilterMode
  query: string
  selectedBackgroundVeteranPerkLevelIntervals: number[]
  selectedCategoryNames: string[]
  selectedPerkGroupIdsByCategory: Record<string, string[]>
  shouldAllowBackgroundStudyBook: boolean
  shouldAllowBackgroundStudyScroll: boolean
  shouldAllowSecondBackgroundStudyScroll: boolean
  shouldIncludeAncientScrollPerkGroups: boolean
  shouldIncludeOriginBackgrounds: boolean
  shouldIncludeOriginPerkGroups: boolean
}

export type SavedBuildRecord = {
  createdAt: string
  id: string
  name: string
  optionalPerkIds: string[]
  pickedPerkIds: string[]
  plannerFilters?: SavedBuildPlannerFilters
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
const maximumSavedBuildFilterValueCount = 500
const maximumSavedBuildQueryLength = 300

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

function normalizeSavedBuildFilterStrings(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  const normalizedValues = new Set<string>()

  for (const value of values) {
    if (typeof value !== 'string') {
      continue
    }

    const normalizedValue = collapseWhitespace(value)

    if (normalizedValue.length === 0) {
      continue
    }

    normalizedValues.add(normalizedValue)

    if (normalizedValues.size >= maximumSavedBuildFilterValueCount) {
      break
    }
  }

  return [...normalizedValues]
}

function normalizeSavedBuildFilterIntervals(
  values: unknown,
  defaultIntervals: readonly number[] = [],
): number[] {
  if (!Array.isArray(values)) {
    return [...defaultIntervals]
  }

  const normalizedIntervals = new Set<number>()

  for (const value of values) {
    if (!Number.isInteger(value) || value <= 0) {
      continue
    }

    normalizedIntervals.add(value)

    if (normalizedIntervals.size >= maximumSavedBuildFilterValueCount) {
      break
    }
  }

  if (values.length > 0 && normalizedIntervals.size === 0) {
    return [...defaultIntervals]
  }

  return [...normalizedIntervals].toSorted(
    (leftInterval, rightInterval) => leftInterval - rightInterval,
  )
}

function normalizeSelectedPerkGroupIdsByCategory(
  selectedPerkGroupIdsByCategory: unknown,
): Record<string, string[]> {
  if (
    selectedPerkGroupIdsByCategory === null ||
    typeof selectedPerkGroupIdsByCategory !== 'object'
  ) {
    return {}
  }

  const normalizedSelectedPerkGroupIdsByCategory: Record<string, string[]> = {}

  for (const [categoryName, selectedPerkGroupIds] of Object.entries(
    selectedPerkGroupIdsByCategory,
  )) {
    const normalizedCategoryName = collapseWhitespace(categoryName)

    if (normalizedCategoryName.length === 0) {
      continue
    }

    const normalizedSelectedPerkGroupIds = normalizeSavedBuildFilterStrings(selectedPerkGroupIds)

    if (normalizedSelectedPerkGroupIds.length > 0) {
      normalizedSelectedPerkGroupIdsByCategory[normalizedCategoryName] =
        normalizedSelectedPerkGroupIds
    }

    if (
      Object.keys(normalizedSelectedPerkGroupIdsByCategory).length >=
      maximumSavedBuildFilterValueCount
    ) {
      break
    }
  }

  return normalizedSelectedPerkGroupIdsByCategory
}

function readBooleanProperty(
  value: Record<string, unknown>,
  key: keyof SavedBuildPlannerFilters,
  defaultValue: boolean,
): boolean {
  return typeof value[key] === 'boolean' ? value[key] : defaultValue
}

function readCategoryFilterMode(value: unknown): CategoryFilterMode | null {
  return value === 'all' || value === 'none' || value === 'selection' ? value : null
}

function readSavedBuildPlannerFilters(value: unknown): SavedBuildPlannerFilters | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null || typeof value !== 'object') {
    return undefined
  }

  const plannerFilters = value as Record<string, unknown>
  const selectedCategoryNames = normalizeSavedBuildFilterStrings(
    plannerFilters.selectedCategoryNames,
  )
  const selectedPerkGroupIdsByCategory = normalizeSelectedPerkGroupIdsByCategory(
    plannerFilters.selectedPerkGroupIdsByCategory,
  )
  const inferredCategoryFilterMode =
    selectedCategoryNames.length > 0 || Object.keys(selectedPerkGroupIdsByCategory).length > 0
      ? 'selection'
      : 'all'
  const shouldAllowBackgroundStudyScroll = readBooleanProperty(
    plannerFilters,
    'shouldAllowBackgroundStudyScroll',
    true,
  )

  return {
    categoryFilterMode:
      readCategoryFilterMode(plannerFilters.categoryFilterMode) ?? inferredCategoryFilterMode,
    query:
      typeof plannerFilters.query === 'string'
        ? collapseWhitespace(plannerFilters.query).slice(0, maximumSavedBuildQueryLength)
        : '',
    selectedBackgroundVeteranPerkLevelIntervals: normalizeSavedBuildFilterIntervals(
      plannerFilters.selectedBackgroundVeteranPerkLevelIntervals,
      baselineBackgroundVeteranPerkLevelIntervals,
    ),
    selectedCategoryNames,
    selectedPerkGroupIdsByCategory,
    shouldAllowBackgroundStudyBook: readBooleanProperty(
      plannerFilters,
      'shouldAllowBackgroundStudyBook',
      true,
    ),
    shouldAllowBackgroundStudyScroll,
    shouldAllowSecondBackgroundStudyScroll:
      shouldAllowBackgroundStudyScroll &&
      readBooleanProperty(plannerFilters, 'shouldAllowSecondBackgroundStudyScroll', false),
    shouldIncludeAncientScrollPerkGroups: readBooleanProperty(
      plannerFilters,
      'shouldIncludeAncientScrollPerkGroups',
      true,
    ),
    shouldIncludeOriginBackgrounds: readBooleanProperty(
      plannerFilters,
      'shouldIncludeOriginBackgrounds',
      false,
    ),
    shouldIncludeOriginPerkGroups: readBooleanProperty(
      plannerFilters,
      'shouldIncludeOriginPerkGroups',
      false,
    ),
  }
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
  optionalPerkIds = [],
  pickedPerkIds,
  plannerFilters,
  referenceVersion,
}: {
  id?: string
  name: string
  now?: Date
  optionalPerkIds?: string[]
  pickedPerkIds: string[]
  plannerFilters?: SavedBuildPlannerFilters
  referenceVersion: string
}): SavedBuildRecord {
  const normalizedPickedPerkIds = normalizePickedPerkIds(pickedPerkIds)
  const normalizedPickedPerkIdSet = new Set(normalizedPickedPerkIds)
  const normalizedOptionalPerkIds = normalizePickedPerkIds(optionalPerkIds).filter(
    (optionalPerkId) => normalizedPickedPerkIdSet.has(optionalPerkId),
  )

  if (normalizedPickedPerkIds.length === 0) {
    throw new Error('A saved build needs at least one perk.')
  }

  const savedAt = now.toISOString()
  const normalizedPlannerFilters = readSavedBuildPlannerFilters(plannerFilters)

  return {
    createdAt: savedAt,
    id,
    name: normalizeSavedBuildName(name),
    optionalPerkIds: normalizedOptionalPerkIds,
    pickedPerkIds: normalizedPickedPerkIds,
    ...(normalizedPlannerFilters ? { plannerFilters: normalizedPlannerFilters } : {}),
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

  const pickedPerkIdSet = new Set(pickedPerkIds)
  const optionalPerkIds = normalizePickedPerkIds(savedBuild.optionalPerkIds).filter(
    (optionalPerkId) => pickedPerkIdSet.has(optionalPerkId),
  )
  const plannerFilters = readSavedBuildPlannerFilters(savedBuild.plannerFilters)

  return {
    createdAt,
    id,
    name: normalizeSavedBuildName(
      typeof savedBuild.name === 'string' ? savedBuild.name : 'Untitled build',
    ),
    optionalPerkIds,
    pickedPerkIds,
    ...(plannerFilters ? { plannerFilters } : {}),
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
