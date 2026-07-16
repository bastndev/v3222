#!/usr/bin/env node

import * as prompts from '@clack/prompts';
import { stdin, stdout } from 'node:process';

import {
  createProject,
  defaultPackageId,
  detectPackageManager,
  normalizeProjectName,
  validatePackageId,
} from './generator.js';

interface CliOptions {
  install?: boolean;
  packageId?: string;
  projectDirectory?: string;
  showHelp: boolean;
}

class PromptCancelledError extends Error {}

function printHelp(): void {
  console.log(`Create an Android-first Lynx app.

Usage:
  v3222 [project-directory] [options]

Options:
  --package-id <id>  Android application ID, for example com.example.myapp
  --install          Install dependencies without prompting
  --skip-install     Generate files without installing dependencies
  -h, --help         Show this help

Project generation never initializes Git or builds Android artifacts.`);
}

function readOptionValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('-')) throw new Error(`${option} requires a value.`);
  return value;
}

function parseArgs(args: readonly string[]): CliOptions {
  const options: CliOptions = { showHelp: false };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument) continue;

    if (argument === '--install') options.install = true;
    else if (argument === '--skip-install' || argument === '--no-install') options.install = false;
    else if (argument === '--package-id') {
      options.packageId = readOptionValue(args, index, argument);
      index += 1;
    } else if (argument.startsWith('--package-id=')) {
      options.packageId = argument.slice('--package-id='.length);
    } else if (argument === '--help' || argument === '-h') {
      options.showHelp = true;
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

function unwrapPrompt<T>(value: T | symbol): T {
  if (prompts.isCancel(value)) {
    prompts.cancel('Project creation cancelled.');
    throw new PromptCancelledError();
  }
  return value;
}

function validationMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
      install: options.install ?? false,
      packageId: options.packageId ?? defaultPackageId(projectName),
    };
  }

  prompts.intro('v3222 · Android-first Lynx app');

  const projectDirectory =
    options.projectDirectory ??
    unwrapPrompt(
      await prompts.text({
        message: 'What should we name your new project?',
        placeholder: './my-lynx-app',
        validate(value) {
          try {
            normalizeProjectName(value ?? '');
          } catch (error) {
            return validationMessage(error);
          }
        },
      }),
    );
  const projectName = normalizeProjectName(projectDirectory);
  const suggestedPackageId = defaultPackageId(projectName);
  const packageId =
    options.packageId ??
    unwrapPrompt(
      await prompts.text({
        message: 'Android application ID',
        initialValue: suggestedPackageId,
        validate(value) {
          try {
            validatePackageId(value ?? '');
          } catch (error) {
            return validationMessage(error);
          }
        },
      }),
    );
  const install =
    options.install ??
    unwrapPrompt(
      await prompts.confirm({
        message: 'Install dependencies now?',
        initialValue: false,
      }),
    );

  validatePackageId(packageId);
  return { ...options, install, packageId, projectDirectory };
}

function printResult(
  result: Awaited<ReturnType<typeof createProject>>,
  interactive: boolean,
  dependenciesInstalled: boolean,
): void {
  const runner =
    result.packageManager === 'npm' ? 'npm run' : result.packageManager === 'bun' ? 'bun run' : result.packageManager;
  const installCommand = result.packageManager === 'yarn' ? 'yarn' : `${result.packageManager} install`;
  const installStep = dependenciesInstalled ? '' : `  ${installCommand}\n`;
  const resultMessage = `🚀 Success! Project created in ${result.projectName}

🛠️  Next steps:
  cd ${JSON.stringify(result.projectDirectory)}
${installStep}  ${runner} doctor
  ${runner} dev

🤖 Android (when requested):
  ${runner} run:android
  ${runner} build:android`;

  if (interactive) {
    prompts.note(resultMessage, 'Result');
    prompts.outro('Good luck out there, v3222! 🎉');
    return;
  }

  console.log(`\n${resultMessage}\n\nGood luck out there, v3222! 🎉`);
}

async function main(): Promise<void> {
  const rawOptions = parseArgs(process.argv.slice(2));
  if (rawOptions.showHelp) {
    printHelp();
    return;
  }

  const interactive = stdin.isTTY && stdout.isTTY;
  const options = await promptForOptions(rawOptions);
  if (interactive) {
    prompts.log.step(`Creating ${normalizeProjectName(options.projectDirectory ?? '')}`);
  }

  const result = await createProject({
    projectDirectory: options.projectDirectory ?? '',
    packageId: options.packageId ?? '',
    install: options.install,
    packageManager: detectPackageManager(),
  });

  printResult(result, interactive, options.install === true);
}

main().catch((error: unknown) => {
  if (error instanceof PromptCancelledError) {
    process.exitCode = 0;
    return;
  }
  prompts.log.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
