import { useEffect } from 'react'

export type IdleImagePreload = {
  src: string
  srcSet?: string
}

const attemptedIdleImagePreloadKeys = new Set<string>()

function getIdleImagePreloadKey(imagePreload: IdleImagePreload): string {
  return `${imagePreload.src}\u0000${imagePreload.srcSet ?? ''}`
}

function scheduleIdleImagePreload(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleCallbackId = window.requestIdleCallback(callback)

    return typeof window.cancelIdleCallback === 'function'
      ? () => window.cancelIdleCallback(idleCallbackId)
      : () => {}
  }

  const timeoutId = window.setTimeout(callback, 1200)

  return () => window.clearTimeout(timeoutId)
}

function preloadImage({ src, srcSet }: IdleImagePreload): void {
  const image = new Image()

  image.decoding = 'async'
  image.fetchPriority = 'low'

  if (srcSet) {
    image.srcset = srcSet
  }

  image.src = src
}

export function useIdleImagePreload(imagePreloads: readonly IdleImagePreload[]): void {
  const imagePreloadKeys = imagePreloads.map(getIdleImagePreloadKey).join('\u0001')

  useEffect(() => {
    if (imagePreloads.length === 0 || typeof Image === 'undefined') {
      return
    }

    let isCancelled = false
    const cancelIdleImagePreload = scheduleIdleImagePreload(() => {
      if (isCancelled) {
        return
      }

      for (const imagePreload of imagePreloads) {
        const imagePreloadKey = getIdleImagePreloadKey(imagePreload)

        if (attemptedIdleImagePreloadKeys.has(imagePreloadKey)) {
          continue
        }

        attemptedIdleImagePreloadKeys.add(imagePreloadKey)
        preloadImage(imagePreload)
      }
    })

    return () => {
      isCancelled = true
      cancelIdleImagePreload()
    }
  }, [imagePreloadKeys, imagePreloads])
}
