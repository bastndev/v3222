# {{displayName}}

An Android-first Lynx app generated with `v3222` and powered by Sparkling.

## Requirements

- Node.js 22 or 24
- Android Studio with Android SDK 35
- JDK 17
- An Android emulator or device for native development

Run the environment check first:

```bash
{{commandPrefix}} doctor
```

## Develop

Start the Lynx development server and open the displayed URL or QR code in Lynx Explorer:

```bash
{{commandPrefix}} dev
```

Rspeedy reloads changes with HMR and reports TypeScript errors during compilation.

Build, install, and launch the native Android debug app:

```bash
{{commandPrefix}} run:android
```

No Android build runs during project generation or dependency installation. The command above is
the first step that invokes the native Android debug build.

## Build Android releases

Explicitly generate a release APK and Android App Bundle:

```bash
{{commandPrefix}} build:android
```

The outputs are written to:

- `android/app/build/outputs/apk/release/app-release.apk` when signed, or `app-release-unsigned.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

Release artifacts are unsigned until `android/keystore.properties` is configured. Copy
`android/keystore.properties.example`, keep the real file private, and never commit signing secrets.

## Other commands

```bash
{{commandPrefix}} test
{{commandPrefix}} typecheck
{{commandPrefix}} format
{{commandPrefix}} check
```

## Customize the starter assets

The generated project owns its default artwork:

- `assets/app-icon.png` — Android application icon
- `assets/splash-logo.png` — native splash-screen logo
- `assets/welcome-hero.png` — first Lynx screen shown from the development QR code

Replace these PNG files with your own artwork while keeping their names, or update their references
in `app.config.ts` and `src/App.tsx`.

This first template intentionally includes Android only. iOS support will be added as a separate,
tested platform template later.
