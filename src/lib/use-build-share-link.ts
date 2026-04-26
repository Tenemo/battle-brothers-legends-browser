import { useEffect, useState } from 'react'

type ShareBuildStatus = 'copied' | 'error' | 'idle'

function getBuildShareUrl(buildShareSearch: string): string {
  const buildSharePath = buildShareSearch ? `/${buildShareSearch}` : '/'

  if (typeof window === 'undefined') {
    return buildSharePath
  }

  return new URL(buildSharePath, window.location.origin).toString()
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall back to the selection-based copy path below.
    }
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.top = '0'
  textArea.style.left = '-9999px'
  document.body.append(textArea)
  textArea.select()

  const didCopy = document.execCommand('copy')
  textArea.remove()

  if (!didCopy) {
    throw new Error('Clipboard copy failed.')
  }
}

export function useBuildShareLink({
  buildShareSearch,
  hasPickedPerks,
}: {
  buildShareSearch: string
  hasPickedPerks: boolean
}): {
  handleShareBuild: () => Promise<void>
  resetShareBuildStatus: () => void
  shareBuildStatus: ShareBuildStatus
} {
  const [shareBuildStatus, setShareBuildStatus] = useState<ShareBuildStatus>('idle')

  async function handleShareBuild() {
    if (!hasPickedPerks) {
      return
    }

    try {
      await copyTextToClipboard(getBuildShareUrl(buildShareSearch))
      setShareBuildStatus('copied')
    } catch {
      setShareBuildStatus('error')
    }
  }

  function resetShareBuildStatus() {
    setShareBuildStatus('idle')
  }

  useEffect(() => {
    if (shareBuildStatus === 'idle') {
      return
    }

    const resetShareBuildStatusTimeout = window.setTimeout(() => {
      setShareBuildStatus('idle')
    }, 1600)

    return () => {
      window.clearTimeout(resetShareBuildStatusTimeout)
    }
  }, [shareBuildStatus])

  return {
    handleShareBuild,
    resetShareBuildStatus,
    shareBuildStatus,
  }
}
