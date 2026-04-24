export function createRootSocialImageSvg(options?: {
  bookIconDataUrl?: string
}): Promise<string>

export function renderRootSocialImagePng(): Promise<Uint8Array>

export function generateRootSocialImage(): Promise<{
  byteLength: number
  path: string
}>
