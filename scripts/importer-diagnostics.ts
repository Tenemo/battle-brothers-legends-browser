export type LegendsImporterWarning = {
  errorMessage: string
  kind: 'parse-warning'
  message: string
  parserContext: string
  source: string
  sourceFilePath: string | null
}

export type LegendsImporterDiagnostics = {
  warnings: LegendsImporterWarning[]
}

export type ImporterDiagnosticContext = {
  diagnostics?: LegendsImporterDiagnostics | null
  sourceFilePath?: string | null
}

export function createImporterDiagnostics(): LegendsImporterDiagnostics {
  return {
    warnings: [],
  }
}

function summarizeDiagnosticSource(source: string): string {
  return source.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function describeDiagnosticError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function addImporterParseWarning(
  diagnosticContext: ImporterDiagnosticContext | null | undefined,
  parserContext: string,
  source: string,
  error: unknown,
): void {
  if (!diagnosticContext?.diagnostics) {
    return
  }

  // Keep unsupported Squirrel fragments non-fatal while making skipped parsing visible during sync.
  diagnosticContext.diagnostics.warnings.push({
    kind: 'parse-warning',
    message: `Unable to parse ${parserContext}.`,
    parserContext,
    source: summarizeDiagnosticSource(source),
    sourceFilePath: diagnosticContext.sourceFilePath ?? null,
    errorMessage: describeDiagnosticError(error),
  })
}
