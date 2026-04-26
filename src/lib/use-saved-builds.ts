import { useCallback, useEffect, useState } from 'react'
import {
  createSavedBuildRecord,
  deleteSavedBuildRecord,
  getSavedBuildPersistenceState,
  listSavedBuildRecords,
  requestSavedBuildPersistence,
  saveSavedBuildRecord,
  type SavedBuildPersistenceState,
  type SavedBuildRecord,
} from './saved-builds-storage'

function getSavedBuildErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Saved builds storage failed.'
}

export function useSavedBuilds({ referenceVersion }: { referenceVersion: string }): {
  deleteSavedBuild: (savedBuildId: string) => Promise<void>
  isSavedBuildsLoading: boolean
  reloadSavedBuilds: () => Promise<void>
  saveCurrentBuild: (options: {
    name: string
    pickedPerkIds: string[]
  }) => Promise<SavedBuildRecord>
  savedBuildPersistenceState: SavedBuildPersistenceState
  savedBuilds: SavedBuildRecord[]
  savedBuildsErrorMessage: string | null
} {
  const [savedBuilds, setSavedBuilds] = useState<SavedBuildRecord[]>([])
  const [isSavedBuildsLoading, setIsSavedBuildsLoading] = useState(true)
  const [savedBuildsErrorMessage, setSavedBuildsErrorMessage] = useState<string | null>(null)
  const [savedBuildPersistenceState, setSavedBuildPersistenceState] =
    useState<SavedBuildPersistenceState>('unknown')

  const reloadSavedBuilds = useCallback(async () => {
    setSavedBuildsErrorMessage(null)

    try {
      const [nextSavedBuilds, nextPersistenceState] = await Promise.all([
        listSavedBuildRecords(),
        getSavedBuildPersistenceState(),
      ])
      setSavedBuilds(nextSavedBuilds)
      setSavedBuildPersistenceState(nextPersistenceState)
    } catch (error) {
      setSavedBuilds([])
      setSavedBuildsErrorMessage(getSavedBuildErrorMessage(error))
    } finally {
      setIsSavedBuildsLoading(false)
    }
  }, [])

  const saveCurrentBuild = useCallback(
    async ({
      name,
      pickedPerkIds,
    }: {
      name: string
      pickedPerkIds: string[]
    }): Promise<SavedBuildRecord> => {
      try {
        setSavedBuildsErrorMessage(null)
        setSavedBuildPersistenceState(await requestSavedBuildPersistence())

        const savedBuild = createSavedBuildRecord({
          name,
          pickedPerkIds,
          referenceVersion,
        })

        await saveSavedBuildRecord(savedBuild)
        await reloadSavedBuilds()

        return savedBuild
      } catch (error) {
        const errorMessage = getSavedBuildErrorMessage(error)
        setSavedBuildsErrorMessage(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [referenceVersion, reloadSavedBuilds],
  )

  const deleteSavedBuild = useCallback(
    async (savedBuildId: string): Promise<void> => {
      try {
        setSavedBuildsErrorMessage(null)
        await deleteSavedBuildRecord(savedBuildId)
        await reloadSavedBuilds()
      } catch (error) {
        const errorMessage = getSavedBuildErrorMessage(error)
        setSavedBuildsErrorMessage(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [reloadSavedBuilds],
  )

  useEffect(() => {
    let shouldKeepResult = true

    async function loadSavedBuilds() {
      setSavedBuildsErrorMessage(null)

      try {
        const [nextSavedBuilds, nextPersistenceState] = await Promise.all([
          listSavedBuildRecords(),
          getSavedBuildPersistenceState(),
        ])

        if (!shouldKeepResult) {
          return
        }

        setSavedBuilds(nextSavedBuilds)
        setSavedBuildPersistenceState(nextPersistenceState)
      } catch (error) {
        if (!shouldKeepResult) {
          return
        }

        setSavedBuilds([])
        setSavedBuildsErrorMessage(getSavedBuildErrorMessage(error))
      } finally {
        if (shouldKeepResult) {
          setIsSavedBuildsLoading(false)
        }
      }
    }

    void loadSavedBuilds()

    return () => {
      shouldKeepResult = false
    }
  }, [])

  return {
    deleteSavedBuild,
    isSavedBuildsLoading,
    reloadSavedBuilds,
    saveCurrentBuild,
    savedBuildPersistenceState,
    savedBuilds,
    savedBuildsErrorMessage,
  }
}
