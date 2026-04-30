export type WaitForProductionDeployOptions = {
  expectedCommitSha: string
  intervalMs: number
  requestTimeoutMs: number
  requiredStableChecks: number
  timeoutMs: number
  webBaseUrl: string
}

export type JsonProbeStatus = {
  commitSha: string | null
  ok: boolean
  statusCode: number | null
  url: string
}

export type HtmlProbeStatus = {
  contentType: string | null
  missingSnippet: string | null
  ok: boolean
  statusCode: number | null
  url: string
}

export type ProductionReadinessStatus = {
  homepage: HtmlProbeStatus
  version: JsonProbeStatus
}

export type WaitForProductionDeployDependencies = {
  loadReadinessStatus?: (
    options: WaitForProductionDeployOptions,
  ) => ProductionReadinessStatus | Promise<ProductionReadinessStatus>
  log?: (message: string) => void
  now?: () => number
  sleep?: (delayMs: number) => Promise<void>
}

export function normalizeAbsoluteOrigin(rawUrl: string, label: string): string

export function normalizeCommitSha(rawCommitSha: string): string

export function parsePositiveInteger(
  rawValue: string | undefined,
  fallback: number,
  label: string,
): number

export function parseWaitForProductionDeployArgs(args: string[]): WaitForProductionDeployOptions

export function readCommitSha(body: unknown): string | null

export function loadProductionReadinessStatus(
  options: WaitForProductionDeployOptions,
): Promise<ProductionReadinessStatus>

export function isProductionReadinessStatusSuccessful(
  status: ProductionReadinessStatus,
  expectedCommitSha: string,
): boolean

export function formatProductionReadinessStatus(status: ProductionReadinessStatus): string

export function waitForProductionDeploy(
  options: WaitForProductionDeployOptions,
  dependencies?: WaitForProductionDeployDependencies,
): Promise<void>
