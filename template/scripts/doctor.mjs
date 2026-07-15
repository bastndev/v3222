import { existsSync, readdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const checks = []

function addCheck(name, passed, details) {
  checks.push({ name, passed, details })
}

function commandOutput(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
  }
}

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '', 10)
addCheck(
  'Node.js 22 or 24',
  nodeMajor === 22 || nodeMajor === 24,
  `found ${process.versions.node}`,
)

const java = commandOutput('java', ['-version'])
const javaVersion = java.output.match(/version "([^"]+)"/u)?.[1]
const javaMajor = Number.parseInt(javaVersion?.split('.')[0] ?? '', 10)
addCheck(
  'JDK 17 or newer',
  java.ok && javaMajor >= 17,
  javaVersion ? `found ${javaVersion}` : 'not found',
)

const home = os.homedir()
const sdkCandidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  path.join(home, 'Android', 'Sdk'),
  path.join(home, 'Library', 'Android', 'sdk'),
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk')
    : undefined,
].filter(Boolean)
const sdkRoot = sdkCandidates.find((candidate) => existsSync(candidate))

addCheck('Android SDK', Boolean(sdkRoot), sdkRoot ?? 'not found')
addCheck(
  'Android SDK Platform 35',
  Boolean(sdkRoot && existsSync(path.join(sdkRoot, 'platforms', 'android-35'))),
  sdkRoot ? path.join(sdkRoot, 'platforms', 'android-35') : 'not found',
)
addCheck(
  'Android Build Tools 35+',
  Boolean(
    sdkRoot &&
    existsSync(path.join(sdkRoot, 'build-tools')) &&
    readdirSync(path.join(sdkRoot, 'build-tools')).some(
      (version) => Number.parseInt(version.split('.')[0] ?? '', 10) >= 35,
    ),
  ),
  sdkRoot ? path.join(sdkRoot, 'build-tools') : 'not found',
)

const adb = commandOutput('adb', ['version'])
addCheck('adb', adb.ok, adb.ok ? adb.output.split('\n')[0] : 'not found')

console.log('\nAndroid development environment\n')
for (const check of checks) {
  console.log(`  ${check.passed ? '✓' : '✗'} ${check.name} — ${check.details}`)
}

const failures = checks.filter((check) => !check.passed)
if (failures.length > 0) {
  console.error(
    `\n${failures.length} issue${failures.length === 1 ? '' : 's'} must be fixed.`,
  )
  process.exitCode = 1
} else {
  console.log('\nYour environment is ready for Android development.')
}
