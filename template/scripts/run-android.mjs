import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { syncAndroidAssets } from './sync-android-assets.mjs'

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const windows = process.platform === 'win32'
const sparkling = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  windows ? 'sparkling-app-cli.cmd' : 'sparkling-app-cli',
)
const packageId = '{{packageId}}'
const launchActivity = `${packageId}.SplashActivity`
const devPort = '5969'

function execute(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
  if (result.error) throw result.error
  return result
}

function run(command, args) {
  const result = execute(command, args)
  if (result.status !== 0) {
    throw new Error(
      `${path.basename(command)} failed with exit code ${result.status ?? 'unknown'}`,
    )
  }
}

function output(command, args) {
  const result = execute(command, args, true)
  if (result.status !== 0) {
    const details = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
    throw new Error(details || `${path.basename(command)} failed`)
  }
  return result.stdout?.trim() ?? ''
}

function connectedDevices() {
  return output('adb', ['devices'])
    .split(/\r?\n/u)
    .slice(1)
    .map((line) => line.trim().split(/\s+/u))
    .filter(([serial, state]) => serial && state)
    .map(([serial, state]) => ({ serial, state }))
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

try {
  const devices = connectedDevices()
  const readyDevices = devices.filter(({ state }) => state === 'device')
  if (readyDevices.length === 0) {
    const states = devices
      .map(({ serial, state }) => `${serial} (${state})`)
      .join(', ')
    throw new Error(
      states
        ? `No authorized Android device is ready: ${states}`
        : 'No Android device is connected. Connect and authorize one before running this command.',
    )
  }
  if (readyDevices.length > 1) {
    throw new Error(
      `More than one Android device is connected: ${readyDevices.map(({ serial }) => serial).join(', ')}`,
    )
  }

  const [{ serial }] = readyDevices
  await syncAndroidAssets()
  run('adb', ['-s', serial, 'reverse', `tcp:${devPort}`, `tcp:${devPort}`])
  run(sparkling, ['run:android', '--skip-copy', '--host', '127.0.0.1'])

  const installedPath = output('adb', [
    '-s',
    serial,
    'shell',
    'pm',
    'path',
    packageId,
  ])
  if (!installedPath.startsWith('package:')) {
    throw new Error(`Android package ${packageId} was not installed.`)
  }

  run('adb', [
    '-s',
    serial,
    'shell',
    'am',
    'start',
    '-W',
    '-n',
    `${packageId}/${launchActivity}`,
  ])
  await delay(1500)
  const processId = output('adb', ['-s', serial, 'shell', 'pidof', packageId])
  if (!processId) {
    throw new Error(`${packageId} stopped immediately after launch.`)
  }

  console.log(`Android app installed and running on ${serial}.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
