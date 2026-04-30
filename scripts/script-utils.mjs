import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'

export async function pathExists(targetPath) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

export function runCommand(commandName, commandArguments) {
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

export function sortUniqueStrings(values) {
  return [...new Set(values.filter(Boolean))].toSorted((leftValue, rightValue) =>
    leftValue.localeCompare(rightValue),
  )
}
