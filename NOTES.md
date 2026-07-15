# Publishing

## One-time npm setup

1. Configure the trusted publisher at:
   `https://www.npmjs.com/package/v3222/access`
2. Use repository `bastndev/v3222` and workflow `publish.yml`.
3. Leave the environment name empty and allow npm publishing.

## Validate locally

```bash
bun install --frozen-lockfile
bun run check
npm pack --dry-run
```

## Release

```bash
npm version patch
git push origin main
git push origin --tags
```

The tag triggers `.github/workflows/publish.yml`, which validates and publishes the package with provenance.
