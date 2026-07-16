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

Requires Node.js 22.18+ or Node.js 24. Node.js 25 is not supported by the Sparkling template.
Bun, npm, pnpm, and Yarn are detected automatically.

```bash
bunx v3222@latest my-app
```

Or with npm:

```bash
npx v3222@latest my-app
```

Running `npm i v3222` only installs the package; npm does not execute generators during installation.
Run an installed copy with `npx v3222`, or use `npx v3222@latest` without installing it first.

When no project name is passed, the interactive flow asks for it. It also lets you confirm or edit
the Android application ID. The generator never initializes Git or creates a commit.

For automation:

```bash
npx v3222 my-app --package-id com.example.myapp
```

Project generation only creates the files and installs JavaScript dependencies. It does not invoke
Gradle, install an Android app, or generate an APK/AAB.

## Generated commands

```bash
bun run doctor
bun run dev
bun run run:android
bun run build:android
```

- `dev` starts the Rspeedy/Lynx preview with HMR and reports TypeScript errors during compilation.
- `run:android` explicitly builds, installs, and launches the Android debug app.
- `build:android` explicitly generates a release APK and AAB.
- `doctor` checks Android tooling only.

Release signing is optional during development. The generated project includes a safe,
gitignored `android/keystore.properties` workflow for Play Store uploads.

## Current foundation

This experiment pins Sparkling `2.1.0-rc.33` because the stable `2.0.1` CLI does not include the
required `dev` command. The generated Android project targets API 35 and upgrades the official
native shell to Android Gradle Plugin 8.10.1 with Kotlin 2.2. Fresco is lifted to 3.7.0 so the
generated release does not retain the official template's non-compliant x86_64 binaries.

The package does not need a `create-<name>` name while it is invoked with `npx` or `bunx`.

## Package development

```bash
bun install
bun run check
```

## 📄 License

MIT © [Gohit X](https://gohit.xyz) — see [`LICENSE`](./LICENSE). Generated projects preserve Sparkling's Apache-2.0 license notice separately.

<br>

---

<div align="center">
  <p>
    Built with <strong>Bun</strong>, <strong>TypeScript</strong>, and <strong>Lynx</strong>.
  </p>
  <p>
    <a href="https://www.gohit.xyz/package/V3222">Website</a> ·
    <a href="https://github.com/bastndev/V3222">GitHub</a> ·
    <a href="https://www.npmjs.com/package/V3222">npm</a>
  </p>
</div>
