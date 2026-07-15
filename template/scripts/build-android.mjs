import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const androidRoot = path.join(projectRoot, 'android')
const windows = process.platform === 'win32'
const sparkling = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  windows ? 'sparkling-app-cli.cmd' : 'sparkling-app-cli',
)
const gradle = path.join(androidRoot, windows ? 'gradlew.bat' : 'gradlew')

function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `${path.basename(command)} failed with exit code ${result.status}`,
    )
  }
}

run(sparkling, ['autolink', '--platform', 'android'], projectRoot)
run(sparkling, ['build', '--skip-copy'], projectRoot)
run(gradle, ['assembleRelease', 'bundleRelease'], androidRoot, {
  ...process.env,
  SPARKLING_USE_NATIVE_ASSETS: 'false',
})

const signingFile = path.join(androidRoot, 'keystore.properties')
const signingKeys = ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']
const signingContent = existsSync(signingFile)
  ? readFileSync(signingFile, 'utf8')
  : ''
const signingConfigured = signingKeys.every((key) =>
  new RegExp(`^${key}\\s*=\\s*\\S+`, 'mu').test(signingContent),
)
const releaseOutput = path.join(
  androidRoot,
  'app',
  'build',
  'outputs',
  'apk',
  'release',
)
const apkName = signingConfigured
  ? 'app-release.apk'
  : 'app-release-unsigned.apk'
const signingStatus = signingConfigured
  ? 'Release signing was configured through android/keystore.properties.'
  : 'Artifacts are unsigned. Configure android/keystore.properties before uploading to Google Play.'

console.log(`
Android release artifacts:
  APK: android/app/build/outputs/apk/release/${apkName}
  AAB: android/app/build/outputs/bundle/release/app-release.aab

${signingStatus}`)
