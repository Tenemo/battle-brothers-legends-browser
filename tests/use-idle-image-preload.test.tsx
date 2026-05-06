import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useIdleImagePreload, type IdleImagePreload } from '../src/lib/use-idle-image-preload'

function TestIdleImagePreload({ imagePreloads }: { imagePreloads: readonly IdleImagePreload[] }) {
  useIdleImagePreload(imagePreloads)

  return null
}

function installIdleImagePreloadMocks() {
  const preloadedImages: Array<{
    decoding: string
    fetchPriority: string
    src: string
    srcset: string
  }> = []
  let nextIdleCallbackId = 1
  const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
    callback({
      didTimeout: false,
      timeRemaining: () => 50,
    })

    nextIdleCallbackId += 1
    return nextIdleCallbackId - 1
  })
  const cancelIdleCallback = vi.fn()

  class MockImage {
    decoding = ''
    fetchPriority = ''
    srcset = ''

    set src(src: string) {
      preloadedImages.push({
        decoding: this.decoding,
        fetchPriority: this.fetchPriority,
        src,
        srcset: this.srcset,
      })
    }
  }

  vi.stubGlobal('Image', MockImage)
  vi.stubGlobal('requestIdleCallback', requestIdleCallback)
  vi.stubGlobal('cancelIdleCallback', cancelIdleCallback)

  return {
    cancelIdleCallback,
    preloadedImages,
    requestIdleCallback,
  }
}

describe('useIdleImagePreload', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  test('does not reschedule idle work for equivalent preload contents', async () => {
    const { preloadedImages, requestIdleCallback } = installIdleImagePreloadMocks()
    const createImagePreloads = (): IdleImagePreload[] => [
      {
        src: '/first.png',
        srcSet: '/first-1x.png 1x, /first-2x.png 2x',
      },
      {
        src: '/second.png',
      },
    ]
    const renderResult = render(<TestIdleImagePreload imagePreloads={createImagePreloads()} />)

    await waitFor(() => {
      expect(preloadedImages.map((image) => image.src)).toEqual(['/first.png', '/second.png'])
    })

    renderResult.rerender(<TestIdleImagePreload imagePreloads={createImagePreloads()} />)

    expect(requestIdleCallback).toHaveBeenCalledTimes(1)
    expect(preloadedImages.map((image) => image.src)).toEqual(['/first.png', '/second.png'])
  })

  test('scopes attempted preload keys to the hook instance', async () => {
    const { preloadedImages } = installIdleImagePreloadMocks()
    const imagePreloads = [
      {
        src: '/trait.png',
      },
    ]
    const firstRenderResult = render(<TestIdleImagePreload imagePreloads={imagePreloads} />)

    await waitFor(() => {
      expect(preloadedImages.map((image) => image.src)).toEqual(['/trait.png'])
    })

    firstRenderResult.unmount()
    render(<TestIdleImagePreload imagePreloads={imagePreloads} />)

    await waitFor(() => {
      expect(preloadedImages.map((image) => image.src)).toEqual(['/trait.png', '/trait.png'])
    })
  })
})
