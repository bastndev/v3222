#!/usr/bin/env node

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import {
  createProject,
  defaultPackageId,
  detectPackageManager,
  normalizeProjectName,
  validatePackageId,
} from './generator.js';

interface CliOptions {
  initGit?: boolean;
  install: boolean;
  packageId?: string;
  projectDirectory?: string;
}

function printHelp(): void {
  console.log(`Create an Android-first Lynx app.

Usage:
  v3222 [project-directory] [options]

Options:
  --package-id <id>  Android application ID, for example com.example.myapp
  --git              Initialize a Git repository without creating a commit
  --no-git           Do not initialize Git
  --skip-install     Generate files without installing dependencies
  -h, --help         Show this help`);
}

function readOptionValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('-')) throw new Error(`${option} requires a value.`);
  return value;
}

function parseArgs(args: readonly string[]): CliOptions {
  const options: CliOptions = { install: true };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument) continue;

    if (argument === '--git') options.initGit = true;
    else if (argument === '--no-git') options.initGit = false;
    else if (argument === '--skip-install' || argument === '--no-install') options.install = false;
    else if (argument === '--package-id') {
      options.packageId = readOptionValue(args, index, argument);
      index += 1;
    } else if (argument.startsWith('--package-id=')) {
      options.packageId = argument.slice('--package-id='.length);
    } else if (argument === '--help' || argument === '-h') {
      printHelp();
      process.exitCode = 0;
      return options;
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    } else if (!options.projectDirectory) {
      options.projectDirectory = argument;
    } else {
      throw new Error(`Unexpected argument: ${argument}`);
    }
  }

  return options;
}

async function promptForOptions(options: CliOptions): Promise<CliOptions> {
  const interactive = stdin.isTTY && stdout.isTTY;
  if (!interactive) {
    if (!options.projectDirectory) {
      throw new Error('Project directory is required in a non-interactive terminal.');
    }
    const projectName = normalizeProjectName(options.projectDirectory);
    return {
      ...options,
      initGit: options.initGit ?? false,
      packageId: options.packageId ?? defaultPackageId(projectName),
    };
  }

  const prompts = createInterface({ input: stdin, output: stdout });
  try {
    const projectAnswer =
      options.projectDirectory ?? (await prompts.question('Project name (my-lynx-app): '));
    const projectDirectory = projectAnswer || 'my-lynx-app';
    const projectName = normalizeProjectName(projectDirectory);
    const suggestedPackageId = defaultPackageId(projectName);
    const packageIdAnswer =
      options.packageId ??
      (await prompts.question(`Android application ID (${suggestedPackageId}): `));
    const packageId = packageIdAnswer || suggestedPackageId;
    validatePackageId(packageId);

    let initGit = options.initGit;
    if (initGit === undefined) {
      const answer = (await prompts.question('Initialize Git? (y/N): ')).trim().toLowerCase();
      initGit = answer === 'y' || answer === 'yes';
    }

    return { ...options, initGit, packageId, projectDirectory };
  } finally {
    prompts.close();
  }
}

async function main(): Promise<void> {
  const rawOptions = parseArgs(process.argv.slice(2));
  if (process.argv.includes('--help') || process.argv.includes('-h')) return;

  const options = await promptForOptions(rawOptions);
  const result = await createProject({
    projectDirectory: options.projectDirectory ?? '',
    packageId: options.packageId ?? '',
    initGit: options.initGit,
    install: options.install,
    packageManager: detectPackageManager(),
  });

  const runner =
    result.packageManager === 'npm'
      ? 'npm run'
      : result.packageManager === 'bun'
        ? 'bun run'
        : result.packageManager;
  console.log(`
Created ${result.displayName} at ${result.projectDirectory}

Next steps:
  cd ${result.projectName}
  ${runner} doctor
  ${runner} dev

Android:
  ${runner} android
  ${runner} build:android`);
}

main().catch((error: unknown) => {
  console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
