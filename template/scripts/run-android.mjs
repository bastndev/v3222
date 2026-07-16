import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { syncAndroidAssets } from './sync-android-assets.mjs'

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const require = createRequire(import.meta.url)
const {
  loadAppConfig,
  resolveDevServerPort,
} = require('sparkling-app-cli/dist/config.js')
const windows = process.platform === 'win32'
const sparkling = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  windows ? 'sparkling-app-cli.cmd' : 'sparkling-app-cli',
)
const packageId = '{{packageId}}'
const launchActivity = `${packageId}.SplashActivity`
const bundleSourceExtra = 'v3222.bundleSource'
const packagedBundleSource = 'main.lynx.bundle'
const devHost = '127.0.0.1'

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

function reverseMappingExists(serial, devPort) {
  return output('adb', ['-s', serial, 'reverse', '--list'])
    .split(/\r?\n/u)
    .some((line) => {
      const fields = line.trim().split(/\s+/u)
      return (
        fields.at(-2) === `tcp:${devPort}` && fields.at(-1) === `tcp:${devPort}`
      )
    })
}

function configureUsbReverse(serial, devPort) {
  output('adb', ['-s', serial, 'reverse', `tcp:${devPort}`, `tcp:${devPort}`])
  if (!reverseMappingExists(serial, devPort)) {
    throw new Error(
      `ADB did not retain reverse mapping tcp:${devPort} -> tcp:${devPort}.`,
    )
  }
}

async function devBundleIsAvailable(devBundleUrl) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1500)
    try {
      const response = await fetch(devBundleUrl, {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (response.ok) {
        const bundle = await response.arrayBuffer()
        if (bundle.byteLength > 0) return true
      }
    } catch {
      // The detached dev server can still be settling after the Android build.
    } finally {
      clearTimeout(timeout)
    }
    await delay(500)
  }
  return false
}

function recentAppLogs(serial, processId) {
  const result = execute(
    'adb',
    ['-s', serial, 'logcat', `--pid=${processId}`, '-d', '-v', 'brief'],
    true,
  )
  if (result.status !== 0) return ''
  return `${result.stdout ?? ''}${result.stderr ?? ''}`
}

function findBundleFailure(logs) {
  const failurePattern =
    /code[:=\s]+10203|error occurred while fetching app bundle|failed to connect to \/?127\.0\.0\.1:\d+|failed to load remote bundle/iu
  return logs.split(/\r?\n/u).find((line) => failurePattern.test(line))
}

async function launchApp(serial, bundleSource) {
  run('adb', ['-s', serial, 'shell', 'am', 'force-stop', packageId])
  const launchOutput = output('adb', [
    '-s',
    serial,
    'shell',
    'am',
    'start',
    '-W',
    '-n',
    `${packageId}/${launchActivity}`,
    '--es',
    bundleSourceExtra,
    bundleSource,
  ])
  if (!/^Status:\s+ok\s*$/imu.test(launchOutput)) {
    throw new Error(
      `Android did not confirm a successful launch:\n${launchOutput}`,
    )
  }
  console.log(launchOutput)
  await delay(2500)

  const pidResult = execute(
    'adb',
    ['-s', serial, 'shell', 'pidof', packageId],
    true,
  )
  const processId =
    pidResult.status === 0
      ? (pidResult.stdout?.trim().split(/\s+/u)[0] ?? '')
      : ''
  if (!processId) {
    throw new Error(`${packageId} stopped immediately after launch.`)
  }

  const bundleFailure = findBundleFailure(recentAppLogs(serial, processId))
  return { bundleFailure, processId }
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
  const { config } = await loadAppConfig(projectRoot)
  const devPort = String(resolveDevServerPort(config))
  const devBundleUrl = `http://${devHost}:${devPort}/${packagedBundleSource}`
  await syncAndroidAssets()
  run(sparkling, ['run:android', '--skip-copy', '--host', devHost])

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

  let bundleSource = packagedBundleSource
  if (await devBundleIsAvailable(devBundleUrl)) {
    try {
      configureUsbReverse(serial, devPort)
      bundleSource = devBundleUrl
    } catch (error) {
      console.warn(
        `USB forwarding could not be verified after installation; using the packaged bundle. ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  } else {
    console.warn(
      `The development bundle is not responding at ${devBundleUrl}; using the packaged bundle.`,
    )
  }

  let launchResult = await launchApp(serial, bundleSource)
  if (bundleSource === devBundleUrl) {
    let reverseStillActive = false
    try {
      reverseStillActive = reverseMappingExists(serial, devPort)
    } catch {
      // ADB may have restarted again between launch and verification.
    }
    if (!reverseStillActive || launchResult.bundleFailure) {
      const reason = !reverseStillActive
        ? 'the USB reverse mapping disappeared'
        : launchResult.bundleFailure
      console.warn(
        `Remote bundle loading failed because ${reason}; relaunching with the packaged bundle.`,
      )
      bundleSource = packagedBundleSource
      launchResult = await launchApp(serial, bundleSource)
    }
  }

  if (launchResult.bundleFailure) {
    throw new Error(
      `Lynx reported a bundle loading failure after launch: ${launchResult.bundleFailure.trim()}`,
    )
  }

  const mode =
    bundleSource === devBundleUrl
      ? `development bundle ${devBundleUrl}`
      : `packaged bundle ${packagedBundleSource}`
  console.log(`Android app installed and launched on ${serial} with ${mode}.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
