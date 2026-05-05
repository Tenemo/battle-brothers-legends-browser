import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

export function runCommand(commandName: string, commandArguments: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(commandName, commandArguments, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let standardOutput = ''
    let standardError = ''

    childProcess.stdout.on('data', (chunk) => {
      standardOutput += chunk.toString()
    })

    childProcess.stderr.on('data', (chunk) => {
      standardError += chunk.toString()
    })

    childProcess.on('error', reject)

    childProcess.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(standardOutput)
        return
      }

      reject(
        new Error(
          `Command failed: ${commandName} ${commandArguments.join(' ')}\n${standardError.trim()}`,
        ),
      )
    })
  })
}

export function sortUniqueStrings(values: Array<string | null | undefined | false>): string[] {
  return [
    ...new Set(
      values.filter((value): value is string => typeof value === 'string' && value !== ''),
    ),
  ].toSorted((leftValue, rightValue) => leftValue.localeCompare(rightValue))
}
