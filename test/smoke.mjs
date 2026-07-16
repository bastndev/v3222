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
  assert.equal(packageJson.scripts['run:android'], 'node scripts/run-android.mjs');
  assert.equal(packageJson.scripts['build:android'], 'node scripts/build-android.mjs');
  assert.equal(packageJson.scripts['sync:android-assets'], 'node scripts/sync-android-assets.mjs');
  assert.equal(packageJson.scripts.postinstall, undefined);
  assert.equal(packageJson.scripts.prepare, undefined);
  assert.equal(packageJson.devDependencies['@rsbuild/plugin-type-check'], '^1.5.0');

  const appConfig = await readFile(
    path.join(result.projectDirectory, 'app.config.ts'),
    'utf8',
  );
  assert.doesNotMatch(appConfig, /@ts-nocheck/);
  assert.match(appConfig, /pluginTypeCheck\(\)/);
  assert.match(appConfig, /appName: 'Generated App'/);
  assert.match(appConfig, /packageName: 'dev\.example\.generated'/);
  assert.doesNotMatch(appConfig, /appIcon:/);
  assert.doesNotMatch(appConfig, /splash-screen/);
  assert.doesNotMatch(appConfig, /\{\{/);

  const gradle = await readFile(
    path.join(result.projectDirectory, 'android/app/build.gradle.kts'),
    'utf8',
  );
  assert.match(gradle, /applicationId = "dev\.example\.generated"/);
  assert.match(gradle, /targetSdk = 35/);
  assert.match(gradle, /core-splashscreen:1\.0\.1/);
  assert.match(gradle, /abiFilters \+= listOf\("armeabi-v7a", "arm64-v8a"\)/);

  const nativeVersions = await readFile(
    path.join(result.projectDirectory, 'android/gradle/libs.versions.toml'),
    'utf8',
  );
  assert.match(nativeVersions, /agp = "8\.10\.1"/);
  assert.match(nativeVersions, /kotlin = "2\.2\.0"/);
  assert.match(nativeVersions, /fresco = "2\.3\.0"/);

  const androidBuildScript = await readFile(
    path.join(result.projectDirectory, 'scripts/build-android.mjs'),
    'utf8',
  );
  assert.match(androidBuildScript, /bundleRelease/);
  assert.match(androidBuildScript, /syncAndroidAssets/);

  const androidRunScript = await readFile(
    path.join(result.projectDirectory, 'scripts/run-android.mjs'),
    'utf8',
  );
  assert.match(androidRunScript, /adb/);
  assert.match(androidRunScript, /reverseMappingExists/);
  assert.match(androidRunScript, /'reverse',\s*'--list'/);
  assert.match(androidRunScript, /resolveDevServerPort/);
  assert.match(androidRunScript, /loadAppConfig/);
  assert.match(androidRunScript, /devBundleIsAvailable/);
  assert.match(androidRunScript, /fetch\(devBundleUrl/);
  assert.match(androidRunScript, /'pm',\s*'path'/);
  assert.match(androidRunScript, /'force-stop'/);
  assert.match(androidRunScript, /v3222\.bundleSource/);
  assert.match(androidRunScript, /main\.lynx\.bundle/);
  assert.match(androidRunScript, /code\[:=\\s\]\+10203/);
  assert.match(androidRunScript, /pidof/);
  assert.match(androidRunScript, /dev\.example\.generated/);
  assert.ok(
    androidRunScript.lastIndexOf('configureUsbReverse(serial, devPort)') >
      androidRunScript.indexOf("run(sparkling, ['run:android'"),
  );
  assert.ok(
    androidRunScript.lastIndexOf('launchApp(serial, bundleSource)') >
      androidRunScript.lastIndexOf('configureUsbReverse(serial, devPort)'),
  );

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
  assert.match(appSource, /\.\.\/assets\/welcome-hero\.png/);
  assert.doesNotMatch(appSource, /\{\{/);

  await stat(path.join(result.projectDirectory, 'assets/app-icon.png'));
  await stat(path.join(result.projectDirectory, 'assets/splash-logo.png'));
  await stat(path.join(result.projectDirectory, 'assets/welcome-hero.png'));
  await assert.rejects(stat(path.join(result.projectDirectory, 'resource')), /ENOENT/);

  const sourceIcon = await readFile(path.join(result.projectDirectory, 'assets/app-icon.png'));
  const nativeIcon = await readFile(
    path.join(
      result.projectDirectory,
      'android/app/src/main/res/mipmap-nodpi/v3222_launcher.png',
    ),
  );
  assert.deepEqual(nativeIcon, sourceIcon);

  const sourceSplash = await readFile(path.join(result.projectDirectory, 'assets/splash-logo.png'));
  const nativeSplash = await readFile(
    path.join(
      result.projectDirectory,
      'android/app/src/main/res/drawable-nodpi/v3222_splash_logo.png',
    ),
  );
  assert.deepEqual(nativeSplash, sourceSplash);

  await assert.rejects(
    stat(path.join(result.projectDirectory, 'android/app/src/main/res/mipmap-mdpi/ic_launcher.webp')),
    /ENOENT/,
  );
  await assert.rejects(
    stat(
      path.join(
        result.projectDirectory,
        'android/app/src/main/res/drawable/ic_launcher_background.xml',
      ),
    ),
    /ENOENT/,
  );

  const androidManifest = await readFile(
    path.join(result.projectDirectory, 'android/app/src/main/AndroidManifest.xml'),
    'utf8',
  );
  assert.match(androidManifest, /android:theme="@style\/Theme\.V3222\.Starting"/);
  assert.match(androidManifest, /android:icon="@mipmap\/v3222_launcher"/);
  assert.match(androidManifest, /android:roundIcon="@mipmap\/v3222_launcher_round"/);
  assert.doesNotMatch(androidManifest, /@mipmap\/ic_launcher/);

  const nativeStyles = await readFile(
    path.join(result.projectDirectory, 'android/app/src/main/res/values/styles.xml'),
    'utf8',
  );
  assert.match(nativeStyles, /Theme\.V3222\.Starting/);
  assert.match(nativeStyles, /windowSplashScreenAnimatedIcon/);
  assert.match(nativeStyles, /@drawable\/v3222_splash_logo/);

  const splashActivity = await readFile(
    path.join(
      result.projectDirectory,
      'android/app/src/main/java/dev/example/generated/SplashActivity.kt',
    ),
    'utf8',
  );
  assert.match(splashActivity, /installSplashScreen\(\)/);

  const debugDevUrl = await readFile(
    path.join(
      result.projectDirectory,
      'android/app/src/debug/java/dev/example/generated/DebugDevUrlSupport.kt',
    ),
    'utf8',
  );
  assert.match(debugDevUrl, /DEFAULT_MAIN_BUNDLE_SOURCE = "main\.lynx\.bundle"/);
  assert.match(debugDevUrl, /getStringExtra\("v3222\.bundleSource"\)/);
  assert.match(debugDevUrl, /runnerSource/);
  assert.doesNotMatch(debugDevUrl, /SPARKLING_DEV_SERVER_HOST/);

  const appStyles = await readFile(path.join(result.projectDirectory, 'src/App.css'), 'utf8');
  assert.match(appStyles, /\.content[\s\S]*flex-direction: column/);

  await stat(path.join(result.projectDirectory, 'src/__test__/App.test.tsx'));
  await assert.rejects(stat(path.join(result.projectDirectory, 'src/App.test.tsx')), /ENOENT/);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

console.log('generator smoke test passed');
