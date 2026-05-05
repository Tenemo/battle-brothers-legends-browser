declare module 'virtual:planner-version' {
  export const plannerVersion: string
}

interface ImportMetaEnv {
  readonly VITE_PLANNER_VERSION: string
  readonly VITE_USE_NETLIFY_IMAGE_CDN: boolean | string
}
