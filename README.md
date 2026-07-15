<div align="center">
<pre>
        ██████╗ ██████╗ ██████╗ ██████╗
        ╚════██╗╚════██╗╚════██╗╚════██╗
██    ██ █████╔╝ █████╝ █████╔╝ █████╔╝
 ██  ██  ╚═══██╗ ██═══╝ ██╔═══╝ ██╔═══╝
   ████  ██████╔╝███████╗███████╗███████╗
        ╚═════╝ ╚══════╝══════╝╚══════╝
</pre>
</div>

> Experimental Android-first Lynx app generator powered by Sparkling.

The first MVP deliberately covers Android only. It creates one project that supports live Lynx
development, a native Android debug app, release APKs, and Android App Bundles.

## Create a project

Requires Node.js 22 or 24. Bun, npm, pnpm, and Yarn are detected automatically.

```bash
bunx v3222@latest my-app
```

Or with npm:

```bash
npx v3222@latest my-app
```

The interactive flow asks only for the project name, Android application ID, and whether Git should
be initialized. Git defaults to **No** and the generator never creates a commit, remote, or push.

For automation:

```bash
npx v3222 my-app --package-id com.example.myapp --no-git
```

## Generated commands

```bash
bun run doctor
bun run dev
bun run android
bun run build:android
```

- `dev` starts the Rspeedy/Lynx preview with HMR.
- `android` builds, installs, and launches the Android debug app.
- `build:android` generates a release APK and AAB.
- `doctor` checks Android tooling only.

Release signing is optional during development. The generated project includes a safe,
gitignored `android/keystore.properties` workflow for Play Store uploads.

## Current foundation

This experiment pins Sparkling `2.1.0-rc.33` because the stable `2.0.1` CLI does not include the
required `dev` command. The generated Android project targets API 35 and upgrades the official
native shell to Android Gradle Plugin 8.6.1, the minimum supported line for that API level.
Fresco is lifted to 3.7.0 so the generated release does not retain the official template's
non-compliant x86_64 binaries.

When the final generator name is chosen, publishing it as `create-<name>` will also enable the
standard `npm create <name>` command.

## Package development

```bash
bun install
bun run check
```

## License

MIT. Generated projects preserve Sparkling's Apache-2.0 license notice separately.
