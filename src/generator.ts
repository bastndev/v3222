import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type PackageManager = 'bun' | 'npm' | 'pnpm' | 'yarn';

export interface CreateProjectOptions {
  projectDirectory: string;
  packageId: string;
  install?: boolean;
  packageManager?: PackageManager;
}

export interface CreateProjectResult {
  displayName: string;
  packageId: string;
  packageManager: PackageManager;
  projectDirectory: string;
  projectName: string;
}

const SPARKLING_VERSION = '2.1.0-rc.33';
const OFFICIAL_PACKAGE_ID = 'com.example.sparkling.go';
const OFFICIAL_PACKAGE_PATH = 'com/example/sparkling/go';
const BINARY_EXTENSIONS = new Set([
  '.jar',
  '.jpg',
  '.jpeg',
  '.keystore',
  '.png',
  '.webp',
]);

function titleCase(value: string): string {
  return value
    .split(/[-_.\s]+/u)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

export function normalizeProjectName(value: string): string {
  const normalized = path
    .basename(value.trim())
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, '-')
    .replace(/^[._-]+|[._-]+$/gu, '')
    .replace(/-{2,}/gu, '-');

  if (!normalized || !/^[a-z0-9]/u.test(normalized)) {
    throw new Error('Project name must contain at least one letter or number.');
  }

  return normalized;
}

export function defaultPackageId(projectName: string): string {
  const finalSegment = projectName
    .toLowerCase()
    .replace(/[^a-z0-9_]+/gu, '_')
    .replace(/^[^a-z]+/u, '')
    .replace(/_+$/gu, '');

  return `com.example.${finalSegment || 'app'}`;
}

export function validatePackageId(value: string): string {
  const packageId = value.trim();
  const segment = /^[a-z][a-z0-9_]*$/u;
  const parts = packageId.split('.');

  if (parts.length < 2 || !parts.every((part) => segment.test(part))) {
    throw new Error(
      'Android application ID must contain at least two lowercase dot-separated segments, for example com.example.myapp.',
    );
  }

  return packageId;
}

export function detectPackageManager(
  userAgent: string | undefined = process.env['npm_config_user_agent'],
): PackageManager {
  const candidate = userAgent?.split(/[\s/]/u)[0];
  if (candidate === 'bun' || candidate === 'bunx') return 'bun';
  if (candidate === 'pnpm' || candidate === 'yarn') {
    return candidate;
  }
  return 'npm';
}

function commandPrefix(packageManager: PackageManager): string {
  if (packageManager === 'npm') return 'npm run';
  if (packageManager === 'bun') return 'bun run';
  return packageManager;
}

function replaceAll(content: string, replacements: ReadonlyMap<string, string>): string {
  let result = content;
  for (const [search, replacement] of replacements) {
    result = result.split(search).join(replacement);
  }
  return result;
}

function shouldSkipOfficialFile(relativePath: string): boolean {
  const normalized = relativePath.split(path.sep).join('/');
  return normalized.startsWith('app/src/androidTest/') || normalized.startsWith('app/src/test/');
}

function outputRelativePath(relativePath: string, packagePath: string): string {
  const normalized = relativePath.split(path.sep).join('/');
  const withNamespace = normalized.split(OFFICIAL_PACKAGE_PATH).join(packagePath);
  const parts = withNamespace.split('/');
  const fileName = parts.at(-1);
  if (fileName === 'gitignore') parts[parts.length - 1] = '.gitignore';
  return path.join(...parts);
}

async function copyTree(
  sourceRoot: string,
  targetRoot: string,
  replacements: ReadonlyMap<string, string>,
  packagePath: string,
  skipOfficialTests: boolean,
  relativePath = '',
): Promise<void> {
  const sourceDirectory = path.join(sourceRoot, relativePath);
  const entries = await readdir(sourceDirectory, { withFileTypes: true });

  for (const entry of entries) {
    const sourceRelativePath = path.join(relativePath, entry.name);
    if (skipOfficialTests && shouldSkipOfficialFile(sourceRelativePath)) continue;

    const destinationRelativePath = outputRelativePath(sourceRelativePath, packagePath);
    const sourcePath = path.join(sourceRoot, sourceRelativePath);
    const destinationPath = path.join(targetRoot, destinationRelativePath);

    if (entry.isDirectory()) {
      await mkdir(destinationPath, { recursive: true });
      await copyTree(
        sourceRoot,
        targetRoot,
        replacements,
        packagePath,
        skipOfficialTests,
        sourceRelativePath,
      );
      continue;
    }

    await mkdir(path.dirname(destinationPath), { recursive: true });
    const extension = path.extname(entry.name).toLowerCase();
    if (BINARY_EXTENSIONS.has(extension)) {
      await copyFile(sourcePath, destinationPath);
    } else {
      const source = await readFile(sourcePath, 'utf8');
      await writeFile(destinationPath, replaceAll(source, replacements), 'utf8');
    }

    const sourceStats = await stat(sourcePath);
    await chmod(destinationPath, sourceStats.mode);
  }
}

function resolveOfficialTemplateRoot(): string {
  const require = createRequire(import.meta.url);
  return path.dirname(require.resolve('sparkling-app-template/package.json'));
}

function resolveCustomTemplateRoot(): string {
  return fileURLToPath(new URL('../template', import.meta.url));
}

function run(command: string, args: readonly string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status ?? 'unknown'}.`);
  }
}

function installDependencies(packageManager: PackageManager, cwd: string): void {
  const args = packageManager === 'yarn' ? [] : ['install'];
  run(packageManager, args, cwd);
}

async function ensureTargetDoesNotExist(projectDirectory: string): Promise<void> {
  try {
    await lstat(projectDirectory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  throw new Error(`Target directory already exists: ${projectDirectory}`);
}

export async function createProject(options: CreateProjectOptions): Promise<CreateProjectResult> {
  const projectName = normalizeProjectName(options.projectDirectory);
  const packageId = validatePackageId(options.packageId);
  const packageManager = options.packageManager ?? detectPackageManager();
  const requestedDirectory = path.resolve(options.projectDirectory);
  const projectDirectory = path.join(path.dirname(requestedDirectory), projectName);
  const displayName = titleCase(projectName);
  const packagePath = packageId.split('.').join('/');
  const replacements = new Map<string, string>([
    [OFFICIAL_PACKAGE_ID, packageId],
    [OFFICIAL_PACKAGE_PATH, packagePath],
    ['{{appNameCamel}}', displayName.replace(/\s+/gu, '')],
    ['{{appName}}', displayName],
    ['{{commandPrefix}}', commandPrefix(packageManager)],
    ['{{ displayName }}', displayName],
    ['{{displayName}}', displayName],
    ['{{packageId}}', packageId],
    ['{{packageNamespace}}', packageId],
    ['{{projectName}}', projectName],
    ['{{sparklingVersion}}', SPARKLING_VERSION],
    ['agp = "7.4.2"', 'agp = "8.10.1"'],
    ['fresco = "2.3.0"', 'fresco = "3.7.0"'],
    ['gradle-8.2-all.zip', 'gradle-8.11.1-bin.zip'],
    ['kotlin = "1.8.10"', 'kotlin = "2.2.0"'],
    ['val forcedKotlinVersion = "1.8.10"', 'val forcedKotlinVersion = "2.2.0"'],
    ['rootProject.name = "Sparkling"', `rootProject.name = "${displayName}"`],
  ]);

  await ensureTargetDoesNotExist(projectDirectory);
  await mkdir(projectDirectory, { recursive: true });

  const officialTemplateRoot = resolveOfficialTemplateRoot();
  await copyTree(
    path.join(officialTemplateRoot, 'android'),
    path.join(projectDirectory, 'android'),
    replacements,
    packagePath,
    true,
  );
  await copyTree(
    resolveCustomTemplateRoot(),
    projectDirectory,
    replacements,
    packagePath,
    false,
  );
  await chmod(path.join(projectDirectory, 'android', 'gradlew'), 0o755);
  await chmod(path.join(projectDirectory, 'scripts', 'build-android.mjs'), 0o755);
  await chmod(path.join(projectDirectory, 'scripts', 'doctor.mjs'), 0o755);

  await mkdir(path.join(projectDirectory, 'resource'), { recursive: true });
  await copyFile(
    path.join(officialTemplateRoot, 'resource', 'app_icon.png'),
    path.join(projectDirectory, 'resource', 'app_icon.png'),
  );
  await copyFile(
    path.join(officialTemplateRoot, 'LICENSE'),
    path.join(projectDirectory, 'SPARKLING_LICENSE'),
  );

  if (options.install !== false) installDependencies(packageManager, projectDirectory);

  return { displayName, packageId, packageManager, projectDirectory, projectName };
}
