import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createProject,
  defaultPackageId,
  detectPackageManager,
  normalizeProjectName,
  validatePackageId,
} from 'v3222';

assert.equal(normalizeProjectName('My Lynx App'), 'my-lynx-app');
assert.equal(defaultPackageId('my-lynx-app'), 'com.example.my_lynx_app');
assert.equal(detectPackageManager('bunx/1.3.4'), 'bun');
assert.equal(validatePackageId('dev.example.mobile'), 'dev.example.mobile');
assert.throws(() => validatePackageId('com.example-app'), /application ID/);

const require = createRequire(import.meta.url);
const cjs = require('v3222');
assert.equal(cjs.normalizeProjectName('CJS App'), 'cjs-app');

const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'v3222-smoke-'));
const requestedTarget = path.join(temporaryRoot, 'Generated App');

try {
  const result = await createProject({
    projectDirectory: requestedTarget,
    packageId: 'dev.example.generated',
    initGit: false,
    install: false,
    packageManager: 'bun',
  });

  assert.equal(result.projectName, 'generated-app');
  assert.equal(result.projectDirectory, path.join(temporaryRoot, 'generated-app'));

  const packageJson = JSON.parse(
    await readFile(path.join(result.projectDirectory, 'package.json'), 'utf8'),
  );
  assert.equal(packageJson.name, 'generated-app');
  assert.equal(packageJson.scripts.dev, 'sparkling-app-cli dev');
  assert.equal(packageJson.scripts.doctor, 'node scripts/doctor.mjs');
  assert.equal(packageJson.scripts.android, 'sparkling-app-cli run:android --skip-copy');
  assert.equal(packageJson.scripts['build:android'], 'node scripts/build-android.mjs');

  const gradle = await readFile(
    path.join(result.projectDirectory, 'android/app/build.gradle.kts'),
    'utf8',
  );
  assert.match(gradle, /applicationId = "dev\.example\.generated"/);
  assert.match(gradle, /targetSdk = 35/);

  const nativeVersions = await readFile(
    path.join(result.projectDirectory, 'android/gradle/libs.versions.toml'),
    'utf8',
  );
  assert.match(nativeVersions, /agp = "8\.10\.1"/);
  assert.match(nativeVersions, /kotlin = "2\.2\.0"/);
  assert.match(nativeVersions, /fresco = "3\.7\.0"/);

  const androidBuildScript = await readFile(
    path.join(result.projectDirectory, 'scripts/build-android.mjs'),
    'utf8',
  );
  assert.match(androidBuildScript, /bundleRelease/);

  await stat(
    path.join(
      result.projectDirectory,
      'android/app/src/main/java/dev/example/generated/SparklingApplication.kt',
    ),
  );
  const gradleWrapper = await stat(path.join(result.projectDirectory, 'android/gradlew'));
  assert.notEqual(gradleWrapper.mode & 0o100, 0);
  await assert.rejects(stat(path.join(result.projectDirectory, 'ios')), /ENOENT/);
  await assert.rejects(stat(path.join(result.projectDirectory, '.git')), /ENOENT/);

  const appSource = await readFile(path.join(result.projectDirectory, 'src/App.tsx'), 'utf8');
  assert.match(appSource, /Generated App/);
  assert.doesNotMatch(appSource, /\{\{/);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

console.log('generator smoke test passed');
