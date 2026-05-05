export function createImporterDiagnostics() {
  return {
    warnings: [],
  }
}

function summarizeDiagnosticSource(source) {
  return source.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function describeDiagnosticError(error) {
  return error instanceof Error ? error.message : String(error)
}

export function addImporterParseWarning(diagnosticContext, parserContext, source, error) {
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
