import { useEffect, useState } from 'react'
import {
  buildPerkBrowserUrlSearch,
  readPerkBrowserUrlStateFromLocation,
  type PerkBrowserUrlState,
  type PerkBrowserUrlStateReadOptions,
  type PerkBrowserUrlStateWriteOptions,
} from './perk-browser-url-state'

export function useInitialPerkBrowserUrlState(
  options: PerkBrowserUrlStateReadOptions,
): PerkBrowserUrlState {
  const [initialUrlState] = useState(() => readPerkBrowserUrlStateFromLocation(options))

  return initialUrlState
}

export function usePerkBrowserUrlSync(
  urlState: PerkBrowserUrlState,
  options: PerkBrowserUrlStateWriteOptions,
  onUrlStateChange?: (urlState: PerkBrowserUrlState) => void,
): void {
  const { availableCategoryNames, perkGroupOptionsByCategory, perksById } = options
  const {
    pickedPerkIds,
    query,
    selectedCategoryNames,
    selectedPerkGroupIdsByCategory,
    shouldIncludeOriginBackgrounds,
  } = urlState

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const nextSearch = buildPerkBrowserUrlSearch(
      {
        pickedPerkIds,
        query,
        selectedCategoryNames,
        selectedPerkGroupIdsByCategory,
        shouldIncludeOriginBackgrounds,
      },
      {
        availableCategoryNames,
        perkGroupOptionsByCategory,
        perksById,
      },
    )

    if (window.location.search === nextSearch) {
      return
    }

    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${nextSearch}${window.location.hash}`,
    )
  }, [
    availableCategoryNames,
    perkGroupOptionsByCategory,
    perksById,
    pickedPerkIds,
    query,
    selectedCategoryNames,
    selectedPerkGroupIdsByCategory,
    shouldIncludeOriginBackgrounds,
  ])

  useEffect(() => {
    if (typeof window === 'undefined' || !onUrlStateChange) {
      return
    }

    const handleUrlStateChange = onUrlStateChange

    function handlePopState() {
      handleUrlStateChange(
        readPerkBrowserUrlStateFromLocation({
          availableCategoryNames,
          perks: [...perksById.values()],
          perkGroupOptionsByCategory,
        }),
      )
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [availableCategoryNames, onUrlStateChange, perkGroupOptionsByCategory, perksById])
}
