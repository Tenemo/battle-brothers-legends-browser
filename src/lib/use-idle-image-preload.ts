import { useEffect, useRef } from 'react'

export type IdleImagePreload = {
  src: string
  srcSet?: string
}

const maximumAttemptedIdleImagePreloadKeyCount = 128

function getIdleImagePreloadKey(imagePreload: IdleImagePreload): string {
  return `${imagePreload.src}\u0000${imagePreload.srcSet ?? ''}`
}

function addAttemptedIdleImagePreloadKey(
  attemptedIdleImagePreloadKeys: Set<string>,
  imagePreloadKey: string,
): boolean {
  if (attemptedIdleImagePreloadKeys.has(imagePreloadKey)) {
    return false
  }

  attemptedIdleImagePreloadKeys.add(imagePreloadKey)

  while (attemptedIdleImagePreloadKeys.size > maximumAttemptedIdleImagePreloadKeyCount) {
    const oldestImagePreloadKey = attemptedIdleImagePreloadKeys.values().next().value

    if (oldestImagePreloadKey === undefined) {
      break
    }

    attemptedIdleImagePreloadKeys.delete(oldestImagePreloadKey)
  }

  return true
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
  const attemptedIdleImagePreloadKeysRef = useRef<Set<string>>(new Set())
  const imagePreloadsRef = useRef(imagePreloads)
  const imagePreloadKeys = imagePreloads.map(getIdleImagePreloadKey).join('\u0001')

  useEffect(() => {
    imagePreloadsRef.current = imagePreloads
  }, [imagePreloads])

  useEffect(() => {
    const scheduledImagePreloads = imagePreloadsRef.current

    if (scheduledImagePreloads.length === 0 || typeof Image === 'undefined') {
      return
    }

    let isCancelled = false
    const cancelIdleImagePreload = scheduleIdleImagePreload(() => {
      if (isCancelled) {
        return
      }

      for (const imagePreload of scheduledImagePreloads) {
        const imagePreloadKey = getIdleImagePreloadKey(imagePreload)

        if (
          !addAttemptedIdleImagePreloadKey(
            attemptedIdleImagePreloadKeysRef.current,
            imagePreloadKey,
          )
        ) {
          continue
        }

        preloadImage(imagePreload)
      }
    })

    return () => {
      isCancelled = true
      cancelIdleImagePreload()
    }
  }, [imagePreloadKeys])
}
