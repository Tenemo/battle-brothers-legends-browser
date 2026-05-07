import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { access } from 'node:fs/promises'
import path from 'node:path'

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

function resolvePortableCommandName(commandName: string): string {
  if (process.platform !== 'win32' || commandName !== 'tar') {
    return commandName
  }

  const windowsDirectoryPath = process.env.SystemRoot ?? process.env.WINDIR ?? 'C:\\Windows'
  const windowsSystemTarPath = path.join(windowsDirectoryPath, 'System32', 'tar.exe')

  return existsSync(windowsSystemTarPath) ? windowsSystemTarPath : commandName
}

export function runCommand(commandName: string, commandArguments: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const portableCommandName = resolvePortableCommandName(commandName)
    const childProcess = spawn(portableCommandName, commandArguments, {
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
          `Command failed: ${portableCommandName} ${commandArguments.join(' ')}\n${standardError.trim()}`,
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
